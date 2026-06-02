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
import {
  cloneAppData,
  persistActiveClientId,
  persistAppData,
  serializeClientsData,
} from './utils/persistence';

const defaultData = { clients: [], activeClientId: null };

export default function App() {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const lastSavedRef = useRef(null);

  useEffect(() => {
    async function load() {
      let initial = null;

      if (window.electronAPI) {
        const saved = await window.electronAPI.loadData();
        if (saved?.clients?.length) {
          initial = {
            clients: saved.clients,
            activeClientId: saved.activeClientId || saved.clients[0].id,
          };
        }
      } else {
        try {
          const saved = JSON.parse(localStorage.getItem('ca-portage-data') || 'null');
          if (saved?.clients?.length) {
            initial = {
              clients: saved.clients,
              activeClientId: saved.activeClientId || saved.clients[0].id,
            };
          }
        } catch {
          // ignore corrupted local storage
        }
      }

      if (!initial) {
        const client = createEmptyClient();
        initial = { clients: [client], activeClientId: client.id };
      }

      initial = {
        ...initial,
        clients: initial.clients.map(normalizeClient),
      };

      setData(initial);
      lastSavedRef.current = cloneAppData(initial);
      setLoaded(true);
    }
    load();
  }, []);

  const isDirty =
    loaded &&
    lastSavedRef.current != null &&
    serializeClientsData(data) !== serializeClientsData(lastSavedRef.current);

  const handleSave = useCallback(async () => {
    const snapshot = await persistAppData(data);
    lastSavedRef.current = snapshot;
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [data]);

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
        <h1>CA Portage</h1>
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
