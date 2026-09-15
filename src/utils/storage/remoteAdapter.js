import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { app } from '../../firebase/sdk';

/**
 * SDK Firestore initialisé à la demande : ce module n'est chargé qu'une fois
 * l'utilisateur connecté, il n'alourdit donc jamais le bundle initial.
 *
 * `persistentLocalCache` fournit un cache hors-ligne IndexedDB partagé entre
 * onglets : l'application fonctionne sans réseau et synchronise automatiquement
 * au retour de la connexion.
 */
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/**
 * Stockage distant Firestore.
 *
 * Structure :
 *   users/{uid}/clients/{clientId}   → un document PAR CLIENT (évite d'écraser
 *                                       tous les clients à chaque enregistrement)
 *   users/{uid}/meta/state           → { activeClientId }
 *
 * Les règles de sécurité (firestore.rules) limitent chaque utilisateur à son
 * propre espace `users/{uid}`.
 */

const clientsCollection = (uid) => collection(db, 'users', uid, 'clients');
const clientDocument = (uid, clientId) => doc(db, 'users', uid, 'clients', clientId);
const metaDocument = (uid) => doc(db, 'users', uid, 'meta', 'state');

/** Champs techniques présents dans Firestore mais absents du modèle de l'app. */
const TECHNICAL_FIELDS = ['updatedAt', 'updatedBy'];

/** Sérialisation déterministe : l'ordre des clés ne doit pas créer de faux écarts. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function toFirestoreDocument(client) {
  const clone = JSON.parse(JSON.stringify(client));
  delete clone.id; // l'identifiant vit dans le nom du document
  return { ...clone, updatedAt: serverTimestamp() };
}

function fromFirestoreDocument(snapshot) {
  const payload = { id: snapshot.id, ...snapshot.data() };
  for (const field of TECHNICAL_FIELDS) delete payload[field];
  return payload;
}

/**
 * Dernier état envoyé au cloud, par client.
 * Permet de n'écrire que ce qui a réellement changé (quota Firestore) et de
 * détecter les clients supprimés localement.
 */
let lastPushed = new Map();

export function resetPushCache() {
  lastPushed = new Map();
}

/**
 * Charge les données distantes.
 * Renvoie `null` si le cloud est vide (l'appelant replie alors sur le local).
 */
export async function loadRemoteData(uid) {
  const [clientsSnapshot, metaSnapshot] = await Promise.all([
    getDocs(clientsCollection(uid)),
    getDoc(metaDocument(uid)),
  ]);

  resetPushCache();
  const clients = clientsSnapshot.docs.map(fromFirestoreDocument);
  for (const client of clients) {
    lastPushed.set(client.id, stableStringify(client));
  }

  if (clients.length === 0) return null;

  return {
    clients,
    activeClientId: metaSnapshot.exists() ? metaSnapshot.data().activeClientId ?? null : null,
  };
}

/** Envoie les données vers Firestore en n'écrivant que les clients modifiés. */
export async function saveRemoteData(uid, data) {
  const clients = data.clients || [];
  const batch = writeBatch(db);
  const keptIds = new Set();

  for (const client of clients) {
    keptIds.add(client.id);
    if (lastPushed.get(client.id) === stableStringify(client)) continue;
    batch.set(clientDocument(uid, client.id), toFirestoreDocument(client));
  }

  // Clients supprimés localement → suppression des documents distants.
  for (const clientId of lastPushed.keys()) {
    if (!keptIds.has(clientId)) batch.delete(clientDocument(uid, clientId));
  }

  batch.set(
    metaDocument(uid),
    { activeClientId: data.activeClientId ?? null },
    { merge: true },
  );

  await batch.commit();

  resetPushCache();
  for (const client of clients) {
    lastPushed.set(client.id, stableStringify(client));
  }

  return data;
}

/** Mémorise uniquement l'onglet actif (opération légère, sans réécrire les clients). */
export async function saveActiveClientId(uid, activeClientId) {
  await setDoc(
    metaDocument(uid),
    { activeClientId: activeClientId ?? null },
    { merge: true },
  );
}

/**
 * Écoute les modifications distantes en temps réel (desktop ↔ mobile).
 * Les instantanés contenant nos propres écritures en attente sont ignorés pour
 * éviter de « renvoyer » nos changements locaux dans l'état de l'application.
 */
export function subscribeRemoteData(uid, onData) {
  return onSnapshot(
    clientsCollection(uid),
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      const clients = snapshot.docs.map(fromFirestoreDocument);
      if (clients.length === 0) return;
      onData({ clients });
    },
    () => {
      // Erreur de droits ou de réseau : on conserve silencieusement les données locales.
    },
  );
}
