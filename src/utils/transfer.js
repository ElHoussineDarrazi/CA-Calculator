import { normalizeClient } from './calculations';
import { createId } from './uuid';

/**
 * Extrait la liste des clients depuis un contenu importé.
 * Accepte soit l'objet complet de l'application ({ clients, activeClientId }),
 * soit un tableau de clients. Les clients incomplets sont normalisés, ce qui
 * permet d'importer aussi bien un export récent qu'un ancien format.
 */
export function extractClients(parsed) {
  const raw = Array.isArray(parsed) ? parsed : parsed?.clients;
  if (!Array.isArray(raw)) {
    throw new Error('Fichier invalide : la liste « clients » est introuvable.');
  }

  return raw.map((client) =>
    normalizeClient({
      ...client,
      id: client?.id || createId(),
    }),
  );
}

/** Télécharge les données de l'application au format JSON. */
export function downloadDataFile(data, dateLabel = new Date().toISOString().slice(0, 10)) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `ca-calculator-${dateLabel}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lit un fichier choisi par l'utilisateur et renvoie ses clients normalisés. */
export async function readDataFile(file) {
  const text = await file.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Fichier illisible : ce n'est pas un JSON valide.");
  }

  return extractClients(parsed);
}

/**
 * Fusionne les clients importés avec les existants (rapprochement par identifiant).
 * Un client importé remplace celui qui porte le même identifiant ; les nouveaux
 * sont ajoutés. Aucun client existant n'est supprimé par un import.
 */
export function mergeImportedClients(currentClients = [], importedClients = []) {
  const merged = new Map(currentClients.map((client) => [client.id, client]));
  for (const client of importedClients) {
    merged.set(client.id, client);
  }
  return [...merged.values()];
}
