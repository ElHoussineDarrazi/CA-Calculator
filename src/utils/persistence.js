/** Copie profonde des données de l'application. */
export function cloneAppData(data) {
  return JSON.parse(JSON.stringify(data));
}

/** Détecte les modifications de contenu (sans le simple changement d'onglet). */
export function serializeClientsData(data) {
  return JSON.stringify(data.clients);
}

export async function loadAppData() {
  if (window.electronAPI) {
    return window.electronAPI.loadData();
  }
  try {
    return JSON.parse(localStorage.getItem('ca-calculator-data') || 'null');
  } catch {
    return null;
  }
}

export async function persistAppData(data) {
  const snapshot = cloneAppData(data);
  if (window.electronAPI) {
    await window.electronAPI.saveData(snapshot);
  } else {
    localStorage.setItem('ca-calculator-data', JSON.stringify(snapshot));
  }
  return snapshot;
}

/** Mémorise l'onglet actif sans marquer l'app comme modifiée. */
export async function persistActiveClientId(activeClientId) {
  const current = await loadAppData();
  if (!current?.clients?.length) return null;

  const snapshot = { ...current, activeClientId };
  return persistAppData(snapshot);
}
