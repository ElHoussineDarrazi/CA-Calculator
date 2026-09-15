import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './env';

/**
 * Initialisation de l'application Firebase et de l'authentification.
 *
 * ⚠️ Ce module importe le SDK : il ne doit JAMAIS être importé statiquement
 * depuis le point d'entrée. Il est chargé à la demande par `auth.js`, ce qui
 * garde le bundle initial léger (~64 Ko) tant que l'utilisateur n'est pas
 * confronté à Firebase.
 */
let app = null;
let auth = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  auth = getAuth(app);
  // La session survit à la fermeture de l'application (desktop comme mobile).
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export { app, auth };