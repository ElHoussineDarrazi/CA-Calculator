/**
 * Configuration Firebase — SANS aucun import du SDK.
 *
 * Ce module est volontairement très léger : il est importé statiquement par
 * l'application (AuthGate, App, persistance) pour savoir si Firebase est activé,
 * sans pour autant embarquer le SDK dans le bundle initial.
 *
 * Le SDK lui-même est chargé à la demande dans `firebase/sdk.js`.
 *
 * ⚠️ La clé `apiKey` n'est PAS un secret : elle est publique par conception et
 * se retrouve dans le bundle. La protection des données repose entièrement sur
 * les règles de sécurité Firestore (voir firestore.rules).
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Firebase n'est activé que si les valeurs indispensables sont fournies
 * (voir .env.example). Sans configuration, l'application conserve son
 * fonctionnement local d'origine : fichier Electron ou localStorage.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/**
 * E-mail unique autorisé à se connecter (mode mono-utilisateur).
 * Vide = tout compte authentifié peut se connecter (comportement actuel).
 * Renseignez `VITE_FIREBASE_ALLOWED_EMAIL` dans `.env.local` et dans les
 * Repository variables GitHub pour n'autoriser que votre compte.
 */
export const allowedEmail = (
  import.meta.env.VITE_FIREBASE_ALLOWED_EMAIL || ''
).trim().toLowerCase();