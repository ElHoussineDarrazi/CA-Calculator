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
    id: crypto.randomUUID(),
    name,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    tjm: 0,
    commissionPercent: 85,
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

export function normalizeClient(client) {
  if (Array.isArray(client.recuperationsPortage)) {
    return {
      ...client,
      recuperationsPortage: sortRecuperationsByDate(client.recuperationsPortage),
    };
  }
  const legacy = toNumber(client.recupererPortage);
  return {
    ...client,
    recuperationsPortage:
      legacy > 0
        ? [
            {
              id: crypto.randomUUID(),
              amount: legacy,
              date: new Date().toISOString().slice(0, 10),
            },
          ]
        : [],
  };
}

export function summarizeClient(client) {
  const { totalMontant, paid, unpaid } = sumMontants(client);
  const recupererPortage = sumRecuperationsPortage(client);
  const restePortage = paid - recupererPortage;

  return { total: totalMontant, paid, unpaid, recupererPortage, restePortage };
}

/** Résumé par client pour les infobulles du menu du haut. */
export function computeClientSummaries(clients) {
  return (clients || []).map((client) => {
    const summary = summarizeClient(client);
    return {
      id: client.id,
      name: client.name?.trim() || 'Sans nom',
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
