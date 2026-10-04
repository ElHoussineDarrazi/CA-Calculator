import { createId } from './uuid';

/** Délai de paiement par défaut du client, en jours (30, 45, 60…). */
export const DEFAULT_PAYMENT_DAYS = 30;

/** Délai de paiement d'un client, en jours, avec repli sur la valeur par défaut. */
export function getPaymentDays(client) {
  const days = toNumber(client?.paymentDays);
  return days > 0 ? days : DEFAULT_PAYMENT_DAYS;
}

/** Quota annuel de jours autorisés (champ laissé vide = non renseigné). */
export function getAuthorizedDays(client) {
  const days = toNumber(client?.authorizedDaysPerYear);
  return days > 0 ? days : 0;
}

/** Total des jours saisis sur tous les mois générés de la mission. */
export function sumDaysWorked(client) {
  const months = getMonthsFromStart(client?.startDate, client?.endDate);
  return months.reduce((sum, month) => sum + toNumber(client?.months?.[month.key]?.daysWorked), 0);
}

/**
 * Jours restants : quota annuel autorisé − total des jours déjà saisis.
 * `null` quand aucun quota n'est renseigné (pas d'information à afficher).
 * Peut être négatif si le quota est dépassé.
 */
export function getRemainingDays(client) {
  const authorized = getAuthorizedDays(client);
  if (authorized <= 0) return null;
  return authorized - sumDaysWorked(client);
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Montant : (TJM × jours travaillés) × reste en % */
export function calculateAmount(tjm, daysWorked, commissionPercent) {
  const tjmValue = toNumber(tjm);
  const days = toNumber(daysWorked);
  const commission = toNumber(commissionPercent);
  return (tjmValue * days * commission) / 100;
}

export function getMonthRestePercent(client, monthKey) {
  const entry = client.months[monthKey];
  if (entry != null && entry.restePercent !== undefined && entry.restePercent !== '') {
    return Number(entry.restePercent) || 0;
  }
  return Number(client.commissionPercent) || 0;
}

export function getMonthMontant(client, monthKey) {
  const entry = client.months[monthKey] || { daysWorked: 0, paid: false };
  return calculateAmount(client.tjm, entry.daysWorked, getMonthRestePercent(client, monthKey));
}

export function sumMontants(client) {
  const months = getMonthsFromStart(client.startDate, client.endDate);
  let totalMontant = 0;
  let paid = 0;
  let unpaid = 0;

  for (const month of months) {
    const amount = getMonthMontant(client, month.key);
    const entry = client.months[month.key] || { daysWorked: 0, paid: false };
    totalMontant += amount;
    if (entry.paid) paid += amount;
    else unpaid += amount;
  }

  return { totalMontant, paid, unpaid };
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(toNumber(amount));
}

export function generateMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getMonthLabel(year, month) {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function getMonthsFromStart(startDateStr, endDateStr = '') {
  if (!startDateStr) return [];

  const start = new Date(startDateStr);
  if (Number.isNaN(start.getTime())) return [];

  const now = new Date();
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);

  let endMonth;
  if (endDateStr) {
    const end = new Date(endDateStr);
    if (Number.isNaN(end.getTime())) return [];
    endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  } else {
    endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (endMonth < startMonth) return [];

  const months = [];
  const cursor = new Date(startMonth);

  while (cursor <= endMonth) {
    months.push({
      key: generateMonthKey(cursor.getFullYear(), cursor.getMonth()),
      label: getMonthLabel(cursor.getFullYear(), cursor.getMonth()),
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function createEmptyClient(name = 'Nouveau client') {
  return {
    id: createId(),
    name,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    tjm: 0,
    commissionPercent: 85,
    paymentDays: DEFAULT_PAYMENT_DAYS,
    authorizedDaysPerYear: 0,
    recuperationsPortage: [],
    months: {},
  };
}

export function sortRecuperationsByDate(entries) {
  return [...(entries || [])].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return toNumber(a.amount) - toNumber(b.amount);
  });
}

export function sumRecuperationsPortage(client) {
  const list = client.recuperationsPortage || [];
  return list.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
}

/**
 * Trie une liste de clients pour l'affichage des onglets.
 * `criterion` : 'start' (date de contrat/début), 'end' (date de fin),
 * 'name' (ordre alphabétique). Les clients sans date valide passent en fin de liste.
 */
export function sortClients(clients, criterion = 'start') {
  const list = [...(clients || [])];

  const dateOf = (client) => {
    const raw = criterion === 'end' ? client.endDate : client.startDate;
    if (!raw) return NaN;
    const time = new Date(`${raw}T00:00:00`).getTime();
    return Number.isFinite(time) ? time : NaN;
  };

  return list.sort((a, b) => {
    if (criterion === 'name') {
      return (a.name || '').trim().localeCompare((b.name || '').trim(), 'fr');
    }
    const timeA = dateOf(a);
    const timeB = dateOf(b);
    const validA = Number.isFinite(timeA);
    const validB = Number.isFinite(timeB);
    if (validA && validB) return timeA - timeB;
    if (validA) return -1;
    if (validB) return 1;
    return 0;
  });
}

/**
 * Vrai si le client a payé tous les mois de sa mission (au moins un mois,
 * et chaque mois généré par les dates de début/fin est marqué payé).
 * Les mois sans montant sont ignorés.
 */
export function isClientFullyPaid(client) {
  const months = getMonthsFromStart(client?.startDate, client?.endDate);
  if (months.length === 0) return false;

  const entries = client.months || {};
  let hasBilledMonth = false;

  for (const month of months) {
    const entry = entries[month.key];
    if (toNumber(entry?.daysWorked) <= 0) continue;
    hasBilledMonth = true;
    if (!entry?.paid) return false;
  }

  return hasBilledMonth;
}

export function normalizeClient(client) {
  const base = Array.isArray(client.recuperationsPortage)
    ? {
        ...client,
        recuperationsPortage: sortRecuperationsByDate(client.recuperationsPortage),
      }
    : (() => {
        const legacy = toNumber(client.recupererPortage);
        return {
          ...client,
          recuperationsPortage:
            legacy > 0
              ? [
                  {
                    id: createId(),
                    amount: legacy,
                    date: new Date().toISOString().slice(0, 10),
                  },
                ]
              : [],
        };
      })();

  return { ...base, paymentDays: getPaymentDays(base) };
}

export function summarizeClient(client) {
  const { totalMontant, paid, unpaid } = sumMontants(client);
  const recupererPortage = sumRecuperationsPortage(client);
  const restePortage = paid - recupererPortage;

  return {
    total: totalMontant,
    paid,
    unpaid,
    recupererPortage,
    restePortage,
    daysWorked: sumDaysWorked(client),
    authorizedDays: getAuthorizedDays(client),
    remainingDays: getRemainingDays(client),
  };
}

/** Résumé par client pour les infobulles du menu du haut. */
export function computeClientSummaries(clients) {
  return (clients || []).map((client) => {
    const summary = summarizeClient(client);
    return {
      id: client.id,
      name: client.name?.trim() || 'Sans nom',
      // Date de contrat brute (AAAA-MM-JJ), utilisée pour le tri des tooltips.
      startDateSort: client.startDate || '',
      ...summary,
    };
  });
}

/** Totaux du menu du haut : agrégation de tous les onglets (clients). */
export function computeGlobalSummary(clients) {
  return (clients || []).reduce(
    (acc, client) => {
      const s = summarizeClient(client);
      acc.total += s.total;
      acc.paid += s.paid;
      acc.unpaid += s.unpaid;
      acc.recupererPortage += s.recupererPortage;
      acc.restePortage += s.restePortage;
      return acc;
    },
    { total: 0, paid: 0, unpaid: 0, recupererPortage: 0, restePortage: 0 },
  );
}
