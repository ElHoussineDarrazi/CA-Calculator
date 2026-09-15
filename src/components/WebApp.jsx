/**
 * Version web en lecture seule (GitHub Pages).
 *
 * - Connexion requise (réutilise AuthGate, mode mono-utilisateur inchangé).
 * - Lecture seule depuis Firestore : JAMAIS d'écriture (ni `persistAppData`,
 *   ni `saveRemoteData`, ni localStorage). Le desktop reste la seule version
 *   d'édition ; le web reflète les données après « Enregistrer tout ».
 * - Abonnement temps réel : les graphiques se mettent à jour dès que le
 *   desktop synchronise.
 */
import { useEffect, useState } from 'react';
import { normalizeClient } from '../utils/calculations';
import AuthGate from './AuthGate';
import Dashboard from './Dashboard';

function WebReadonlyInner({ authUser }) {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authUser) return undefined;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      try {
        const { loadRemoteData, subscribeRemoteData } = await import(
          '../utils/storage/remoteAdapter'
        );
        if (cancelled) return;

        // Chargement initial (cache IndexedDB hors-ligne inclus).
        try {
          const initial = await loadRemoteData(authUser.uid);
          if (!cancelled && initial?.clients) {
            setClients(initial.clients.map(normalizeClient));
          }
        } catch {
          // L'abonnement ci-dessous fournira les données dès que possible.
        }

        // Mises à jour temps réel (lecture seule : on ne fait que `setClients`).
        unsubscribe = subscribeRemoteData(authUser.uid, ({ clients: next }) => {
          if (cancelled) return;
          setClients((next || []).map(normalizeClient));
        });
      } catch {
        if (!cancelled) {
          setError('Impossible de charger les données. Vérifiez votre connexion.');
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authUser]);

  const handleSignOut = async () => {
    try {
      const { signOutUser } = await import('../firebase/auth');
      await signOutUser();
    } catch {
      // Non bloquant : la session expirera d'elle-même.
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-summary">
          <h1>CA Calculator</h1>
          <span className="readonly-badge" title="La saisie se fait dans l'application desktop">
            Lecture seule
          </span>
        </div>
        <div className="header-tools">
          <span className="tool-user">{authUser.email}</span>
          <button type="button" className="tool-btn" onClick={handleSignOut}>
            Déconnexion
          </button>
        </div>
      </header>

      {error && (
        <div className="app-banners">
          <div className="banner banner-error">{error}</div>
        </div>
      )}

      {clients == null && !error ? (
        <div className="auth-screen">
          <p className="auth-loading">Chargement des données…</p>
        </div>
      ) : (
        <Dashboard clients={clients || []} />
      )}
    </div>
  );
}

export default function WebApp() {
  return (
    <AuthGate>{(authUser) => (authUser ? <WebReadonlyInner authUser={authUser} /> : null)}</AuthGate>
  );
}
