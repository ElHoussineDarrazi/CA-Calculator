import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TabBar from './components/TabBar';
import ClientPanel from './components/ClientPanel';
import HeaderSummaryItem from './components/HeaderSummaryItem';
import {
  computeClientSummaries,
  computeGlobalSummary,
  createEmptyClient,
  normalizeClient,
} from './utils/calculations';
import { confirmDelete } from './utils/confirm';
import { isFirebaseConfigured } from './firebase/env';
import {
  clearCloudPushPending,
  cloneAppData,
  getLastSyncError,
  isCloudPushPending,
  loadAppData,
  persistActiveClientId,
  persistAppData,
  serializeClientsData,
} from './utils/persistence';
import { downloadDataFile, mergeImportedClients, readDataFile } from './utils/transfer';

const defaultData = { clients: [], activeClientId: null };

export default function App({ authUser = null }) {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [cloudPending, setCloudPending] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [transferNotice, setTransferNotice] = useState(null);
  const lastSavedRef = useRef(null);
  const isDirtyRef = useRef(false);
  const dataRef = useRef(data);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      const saved = await loadAppData();

      let initial;
      if (saved?.clients?.length) {
        initial = {
          clients: saved.clients,
          activeClientId: saved.activeClientId || saved.clients[0].id,
        };
      } else {
        const client = createEmptyClient();
        initial = { clients: [client], activeClientId: client.id };
      }

      initial = {
        ...initial,
        clients: initial.clients.map(normalizeClient),
      };

      setData(initial);
      lastSavedRef.current = cloneAppData(initial);
      setCloudPending(isCloudPushPending());
      setLoaded(true);
    }
    load();
  }, []);

  const isDirty =
    loaded &&
    lastSavedRef.current != null &&
    serializeClientsData(data) !== serializeClientsData(lastSavedRef.current);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Synchronisation temps réel Firestore : desktop ↔ web ↔ mobile.
  useEffect(() => {
    if (!isFirebaseConfigured || !authUser || !loaded) return undefined;

    let unsubscribeRemote = () => {};
    let cancelled = false;

    import('./utils/storage/remoteAdapter').then(({ subscribeRemoteData }) => {
      if (cancelled) return;

      unsubscribeRemote = subscribeRemoteData(authUser.uid, ({ clients }) => {
        // Ne jamais écraser des modifications locales non enregistrées.
        if (isDirtyRef.current) return;

        const normalized = clients.map(normalizeClient);
        const previous = dataRef.current;
        const next = {
          clients: normalized,
          activeClientId: normalized.some((client) => client.id === previous.activeClientId)
            ? previous.activeClientId
            : normalized[0].id,
        };

        // Données issues du cloud : elles sont déjà enregistrées.
        lastSavedRef.current = cloneAppData(next);
        setData(next);
      });
    });

    return () => {
      cancelled = true;
      unsubscribeRemote();
    };
  }, [loaded, authUser]);

  // Les messages de transfert (export / import) disparaissent automatiquement.
  useEffect(() => {
    if (!transferNotice) return undefined;

    const timer = setTimeout(() => setTransferNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [transferNotice]);

  const handleSave = useCallback(async () => {
    const snapshot = await persistAppData(data);
    lastSavedRef.current = snapshot;
    clearCloudPushPending();
    setCloudPending(false);
    setSyncError(getLastSyncError());
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [data]);

  const handleExport = useCallback(() => {
    downloadDataFile(data);
    setTransferNotice({ type: 'success', text: 'Fichier JSON téléchargé.' });
  }, [data]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // autorise la réimportation du même fichier
    if (!file) return;

    try {
      const importedClients = await readDataFile(file);

      if (importedClients.length === 0) {
        setTransferNotice({ type: 'error', text: 'Aucun client trouvé dans ce fichier.' });
        return;
      }

      const confirmed = confirmDelete(
        `Importer ${importedClients.length} client(s) depuis « ${file.name} » ?\n\n` +
          'Les clients de même identifiant seront remplacés, les autres ajoutés.\n' +
          'Cliquez ensuite sur « Enregistrer tout » pour valider.',
      );
      if (!confirmed) return;

      setData((prev) => ({
        clients: mergeImportedClients(prev.clients, importedClients),
        activeClientId: prev.activeClientId,
      }));
      setTransferNotice({
        type: 'success',
        text: `${importedClients.length} client(s) importé(s). Pensez à « Enregistrer tout ».`,
      });
    } catch (error) {
      setTransferNotice({
        type: 'error',
        text: error.message || "Échec de l'import du fichier.",
      });
    }
  }, []);

  const handleSignOut = useCallback(() => {
    if (!isFirebaseConfigured) return;

    import('./firebase/auth')
      .then(({ signOutUser }) => signOutUser())
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded || !isDirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [loaded, isDirty]);

  useEffect(() => {
    if (!loaded) return undefined;

    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) handleSave();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loaded, isDirty, handleSave]);

  const activeClient = data.clients.find((c) => c.id === data.activeClientId);

  const updateClient = useCallback((clientId, updates) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === clientId ? { ...c, ...updates } : c)),
    }));
  }, []);

  const updateMonth = useCallback((clientId, monthKey, updates) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          months: {
            ...c.months,
            [monthKey]: { daysWorked: 0, paid: false, ...c.months[monthKey], ...updates },
          },
        };
      }),
    }));
  }, []);

  const addClient = useCallback(() => {
    const client = createEmptyClient();
    setData((prev) => ({
      clients: [...prev.clients, client],
      activeClientId: client.id,
    }));
  }, []);

  const removeClient = useCallback((clientId) => {
    const client = data.clients.find((c) => c.id === clientId);
    const name = client?.name?.trim() || 'Sans nom';
    if (
      !confirmDelete(
        `Supprimer l'onglet « ${name} » et toutes les données associées ?\n\nCette action est irréversible.`,
      )
    ) {
      return;
    }

    setData((prev) => {
      const clients = prev.clients.filter((c) => c.id !== clientId);
      if (clients.length === 0) {
        const newClient = createEmptyClient();
        return { clients: [newClient], activeClientId: newClient.id };
      }
      const activeClientId =
        prev.activeClientId === clientId ? clients[0].id : prev.activeClientId;
      return { clients, activeClientId };
    });
  }, [data.clients]);

  const setActiveClient = useCallback((clientId) => {
    setData((prev) => ({ ...prev, activeClientId: clientId }));

    if (lastSavedRef.current) {
      lastSavedRef.current = { ...lastSavedRef.current, activeClientId: clientId };
    }

    persistActiveClientId(clientId);
  }, []);

  const globalSummary = computeGlobalSummary(data.clients);
  const clientSummaries = useMemo(
    () => computeClientSummaries(data.clients),
    [data.clients],
  );

  if (!loaded) return null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>CA Calculator</h1>
          {isFirebaseConfigured && authUser && (
            <span className="sync-badge" title={`Connecté : ${authUser.email}`}>
              ☁ Synchronisé
            </span>
          )}
        </div>
        <div className="header-actions">
          <div className="global-summary">
            <HeaderSummaryItem
              label="Total CA"
              total={globalSummary.total}
              metric="total"
              clients={clientSummaries}
              activeClientId={data.activeClientId}
              onSelectClient={setActiveClient}
            />
            <HeaderSummaryItem
              label="Payé"
              total={globalSummary.paid}
              metric="paid"
              clients={clientSummaries}
              activeClientId={data.activeClientId}
              onSelectClient={setActiveClient}
            />
            <HeaderSummaryItem
              label="Reste à chez le client"
              total={globalSummary.unpaid}
              metric="unpaid"
              clients={clientSummaries}
              activeClientId={data.activeClientId}
              className="unpaid"
              onSelectClient={setActiveClient}
            />
            <HeaderSummaryItem
              label="Récupéré portage"
              total={globalSummary.recupererPortage}
              metric="recupererPortage"
              clients={clientSummaries}
              activeClientId={data.activeClientId}
              className="recuperer"
              onSelectClient={setActiveClient}
            />
            <HeaderSummaryItem
              label="Reste portage"
              total={globalSummary.restePortage}
              metric="restePortage"
              clients={clientSummaries}
              activeClientId={data.activeClientId}
              className="reste-portage"
              onSelectClient={setActiveClient}
            />
          </div>
          <div className="header-tools">
            <button
              type="button"
              className="tool-btn"
              onClick={handleExport}
              title="Télécharger toutes les données dans un fichier JSON"
            >
              Exporter
            </button>
            <button
              type="button"
              className="tool-btn"
              onClick={handleImportClick}
              title="Importer un fichier JSON (ancien clients.json, export…)"
            >
              Importer
            </button>
            {isFirebaseConfigured && authUser && (
              <button
                type="button"
                className="tool-btn"
                onClick={handleSignOut}
                title={`Déconnecter ${authUser.email}`}
              >
                Déconnexion
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden-file-input"
              onChange={handleImportFile}
            />
          </div>
          <div className="save-area">
            {isDirty && !justSaved && (
              <span className="unsaved-hint" title="Tous les onglets clients">
                Modifications non enregistrées (tous les onglets)
              </span>
            )}
            {justSaved && !isDirty && (
              <span className="saved-hint">Toute l&apos;application est enregistrée</span>
            )}
            <button
              type="button"
              className={`save-btn ${justSaved && !isDirty ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={!isDirty}
              title="Enregistrer tous les clients et toutes les données (⌘S / Ctrl+S)"
            >
              {justSaved && !isDirty ? 'Tout enregistré ✓' : 'Enregistrer tout'}
            </button>
          </div>
        </div>
      </header>

      {(cloudPending || syncError || transferNotice) && (
        <div className="app-banners">
          {cloudPending && (
            <div className="banner banner-info">
              Vos données locales ne sont pas encore dans le cloud. Cliquez sur « Enregistrer
              tout » pour les synchroniser.
            </div>
          )}
          {syncError && <div className="banner banner-error">{syncError}</div>}
          {transferNotice && (
            <div
              className={`banner ${
                transferNotice.type === 'error' ? 'banner-error' : 'banner-success'
              }`}
            >
              {transferNotice.text}
            </div>
          )}
        </div>
      )}

      <TabBar
        clients={data.clients}
        activeClientId={data.activeClientId}
        onSelect={setActiveClient}
        onAdd={addClient}
        onRemove={removeClient}
      />

      {activeClient ? (
        <ClientPanel
          client={activeClient}
          onUpdateClient={updateClient}
          onUpdateMonth={updateMonth}
        />
      ) : (
        <div className="empty-state">
          <p>Aucun client. Ajoutez un onglet pour commencer.</p>
          <button type="button" onClick={addClient}>
            + Ajouter un client
          </button>
        </div>
      )}
    </div>
  );
}
