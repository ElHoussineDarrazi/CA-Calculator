import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './sdk';

/** Codes d'erreur Firebase traduits en français. */
const ERROR_MESSAGES = {
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/missing-password': 'Mot de passe manquant.',
  'auth/weak-password': 'Mot de passe trop faible (6 caractères minimum).',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse e-mail.',
  'auth/invalid-credential': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'Adresse e-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte ne correspond à cette adresse e-mail.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre réseau.',
  'auth/operation-not-allowed':
    "Cette méthode de connexion n'est pas activée dans la console Firebase.",
};

export function translateAuthError(error) {
  return ERROR_MESSAGES[error?.code] || error?.message || 'Une erreur est survenue.';
}

/** Utilisateur connecté, ou `null`. Ne déclenche aucun appel réseau. */
export function getCurrentUser() {
  return auth?.currentUser ?? null;
}

/**
 * Notifie les changements de session (connexion / déconnexion / restauration).
 * Renvoie la fonction de désabonnement.
 */
export function subscribeAuthState(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function sendResetEmail(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  return signOut(auth);
}
