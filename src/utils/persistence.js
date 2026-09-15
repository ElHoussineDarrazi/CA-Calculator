import { isFirebaseConfigured } from '../firebase/env';

const STORAGE_KEY = 'ca-calculator-data';

/**
 * Passe à `true` quand des données locales existent alors que le cloud est vide.
 * L'utilisateur doit alors cliquer sur « Enregistrer tout » pour amorcer
 * Firestore : aucune donnée n'est poussée ni écrasée à son insu.
 */
let cloudPushPending = false;

/** Dernière erreur de synchronisation distante (null si tout va bien). */
let lastSyncError = null;

export function isCloudPushPending() {
  return cloudPushPending;
}

export function clearCloudPushPending() {
  cloudPushPending = false;
}

export function getLastSyncError() {
  return lastSyncError;
}

/** Copie profonde des données de l'application. */
export function cloneAppData(data) {
  return JSON.parse(JSON.stringify(data));
}

/** Détecte les modifications de contenu (sans le simple changement d'onglet). */
export function serializeClientsData(data) {
  return JSON.stringify(data.clients);
}

function hasClients(data) {
  return Boolean(data?.clients?.length);
}

function readLocalStorageData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeLocalStorageData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage indisponible (navigation privée, quota) : le cloud prend le relais.
  }
}

/** Utilisateur Firestore connecté, ou `null` si Firebase est inactif/hors session. */
async function currentRemoteUserId() {
  if (!isFirebaseConfigured) return null;

  try {
    const { getCurrentUser } = await import('../firebase/auth');
    return getCurrentUser()?.uid ?? null;
  } catch {
    return null;
  }
}

/** Lecture du stockage local de l'appareil (fichier Electron ou localStorage). */
async function readDeviceData() {
  if (window.electronAPI) {
    try {
      return await window.electronAPI.loadData();
    } catch {
      return null;
    }
  }
  return readLocalStorageData();
}

/** Écriture du stockage local de l'appareil (fichier Electron ou localStorage). */
async function writeDeviceData(data) {
  if (window.electronAPI) {
    await window.electronAPI.saveData(data);
    return;
  }
  writeLocalStorageData(data);
}

/** Charge les données distantes si Firebase est configuré et l'utilisateur connecté. */
async function loadRemoteIfSignedIn() {
  const uid = await currentRemoteUserId();
  if (!uid) return null;

  try {
    const { loadRemoteData } = await import('./storage/remoteAdapter');
    return await loadRemoteData(uid);
  } catch {
    // Hors-ligne ou droits insuffisants : on continue avec les données locales.
    return null;
  }
}

/**
 * Charge les données de l'application.
 * Priorité : cloud (si connecté et non vide) → stockage local de l'appareil.
 */
export async function loadAppData() {
  cloudPushPending = false;

  const remote = await loadRemoteIfSignedIn();
  if (hasClients(remote)) {
    await writeDeviceData(remote); // cache local de secours
    return remote;
  }

  const device = await readDeviceData();
  if (hasClients(device) && (await currentRemoteUserId())) {
    cloudPushPending = true;
  }

  return device;
}

/**
 * Enregistre les données : toujours en local (fichier Electron ou localStorage),
 * puis dans Firestore si l'utilisateur est connecté.
 */
export async function persistAppData(data) {
  const snapshot = cloneAppData(data);

  await writeDeviceData(snapshot);

  const uid = await currentRemoteUserId();
  if (uid) {
    try {
      const { saveRemoteData } = await import('./storage/remoteAdapter');
      await saveRemoteData(uid, snapshot);
      cloudPushPending = false;
      lastSyncError = null;
    } catch (error) {
      lastSyncError =
        error?.code === 'permission-denied'
          ? 'Synchronisation refusée : vérifiez les règles de sécurité Firestore.'
          : 'Synchronisation cloud impossible. Les données sont enregistrées localement.';
    }
  }

  return snapshot;
}

/**
 * Mémorise l'onglet actif sans marquer l'app comme modifiée.
 * Opération légère : les clients ne sont pas réécrits.
 */
export async function persistActiveClientId(activeClientId) {
  const current = await readDeviceData();
  if (!hasClients(current)) return null;

  const snapshot = { ...current, activeClientId };
  await writeDeviceData(snapshot);

  const uid = await currentRemoteUserId();
  if (uid) {
    try {
      const { saveActiveClientId } = await import('./storage/remoteAdapter');
      await saveActiveClientId(uid, activeClientId);
    } catch {
      // Non bloquant : l'onglet actif est un simple confort d'affichage.
    }
  }

  return snapshot;
}