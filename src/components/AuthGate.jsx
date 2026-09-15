import { useEffect, useState } from 'react';
import { allowedEmail, isFirebaseConfigured } from '../firebase/env';

/**
 * Charge le module d'authentification (et donc le SDK Firebase) à la demande,
 * une seule fois. Le SDK n'est ainsi jamais présent dans le bundle initial.
 */
let authModulePromise = null;

function loadAuthModule() {
  if (!authModulePromise) authModulePromise = import('../firebase/auth');
  return authModulePromise;
}

/**
 * Garde d'authentification.
 *
 * - Firebase non configuré → l'application s'affiche directement (mode local).
 * - Firebase configuré     → une connexion est requise avant d'accéder aux données.
 *
 * `children` est un render-prop : il reçoit l'utilisateur connecté, ce qui évite
 * au reste de l'application d'importer elle-même le SDK Firebase.
 *
 * L'authentification par e-mail / mot de passe est volontairement retenue : elle
 * n'ouvre aucune fenêtre externe, contrairement à `signInWithPopup` qui est
 * bloqué par la politique de sécurité d'Electron.
 */
export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!isFirebaseConfigured);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    let unsubscribe = () => {};
    let cancelled = false;

    loadAuthModule().then(({ subscribeAuthState }) => {
      if (cancelled) return;

      unsubscribe = subscribeAuthState((nextUser) => {
        // Mode mono-utilisateur : un autre compte connecté est aussitôt
        // déconnecté (défense côté client — voir aussi firestore.rules).
        if (nextUser && allowedEmail && (nextUser.email || '').toLowerCase() !== allowedEmail) {
          loadAuthModule().then(({ signOutUser }) => signOutUser().catch(() => {}));
          setUser(null);
          setMessage({
            type: 'error',
            text: "Ce compte n'est pas autorisé à accéder à cette application.",
          });
          setReady(true);
          return;
        }
        setUser(nextUser);
        setReady(true);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const renderApp = () => (typeof children === 'function' ? children(user) : children);

  if (!isFirebaseConfigured) return renderApp();

  if (!ready) {
    return (
      <div className="auth-screen">
        <p className="auth-loading">Chargement…</p>
      </div>
    );
  }

  if (user) return renderApp();

  const isSignIn = mode === 'signin';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const { signIn, signUp, translateAuthError } = await loadAuthModule();

      try {
        if (isSignIn) {
          const credential = await signIn(email.trim(), password);
          // Mode mono-utilisateur : refuser tout autre compte immédiatement.
          if (allowedEmail && (credential.user?.email || '').toLowerCase() !== allowedEmail) {
            const { signOutUser } = await loadAuthModule();
            await signOutUser().catch(() => {});
            setMessage({
              type: 'error',
              text: "Ce compte n'est pas autorisé à accéder à cette application.",
            });
          } else {
            setPassword('');
          }
        } else {
          await signUp(email.trim(), password);
          setPassword('');
        }
      } catch (error) {
        setMessage({ type: 'error', text: translateAuthError(error) });
      }
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger le module de connexion.' });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setMessage({
        type: 'error',
        text: 'Saisissez votre adresse e-mail pour la réinitialiser.',
      });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const { sendResetEmail, translateAuthError } = await loadAuthModule();

      try {
        await sendResetEmail(email.trim());
        setMessage({
          type: 'success',
          text: 'Un e-mail de réinitialisation vient de vous être envoyé.',
        });
      } catch (error) {
        setMessage({ type: 'error', text: translateAuthError(error) });
      }
    } catch {
      setMessage({ type: 'error', text: 'Impossible de charger le module de connexion.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">CA Calculator</h1>
        <p className="auth-subtitle">
          {isSignIn
            ? 'Connectez-vous pour retrouver vos données sur tous vos appareils.'
            : 'Créez un compte pour synchroniser vos données dans le cloud.'}
        </p>

        <div className="auth-field">
          <label htmlFor="auth-email">Adresse e-mail</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@example.com"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="auth-password">Mot de passe</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="6 caractères minimum"
            minLength={6}
            required
          />
        </div>

        {message && (
          <p className={`auth-message ${message.type === 'error' ? 'error' : 'success'}`}>
            {message.text}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Veuillez patienter…' : isSignIn ? 'Se connecter' : 'Créer le compte'}
        </button>

        <div className="auth-links">
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              setMode(isSignIn ? 'signup' : 'signin');
              setMessage(null);
            }}
          >
            {isSignIn ? 'Créer un compte' : "J'ai déjà un compte"}
          </button>
          {isSignIn && (
            <button type="button" className="auth-link" onClick={handleReset} disabled={busy}>
              Mot de passe oublié ?
            </button>
          )}
        </div>

        <p className="auth-hint">
          Vos données restent privées : les règles Firestore limitent l&apos;accès à votre
          seul compte.
        </p>
      </form>
    </div>
  );
}
