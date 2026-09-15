/**
 * Génère un identifiant unique.
 *
 * `crypto.randomUUID()` n'est disponible qu'en **contexte sécurisé** (HTTPS,
 * `localhost`, `file://` sous Electron). En HTTP simple — par exemple lorsqu'on
 * ouvre l'application depuis un téléphone via `http://192.168.x.x:5173` — l'API
 * est absente et l'application planterait au démarrage.
 *
 * `crypto.getRandomValues()`, lui, reste disponible partout : on l'utilise donc
 * pour construire un UUID v4 conforme (RFC 4122).
 */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    // Dernier recours (environnement très restreint) : suffisant pour un identifiant local.
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // Positionne la version (4) et la variante (RFC 4122).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}