/**
 * Tableau de bord en lecture seule (version web déployée).
 *
 * Desktop (Electron) = application complète d'édition.
 * Web (GitHub Pages, VITE_WEB_READONLY=true) = graphiques + indicateurs clés,
 * AUCUN bouton Modifier / Enregistrer / Importer, AUCUNE écriture.
 */
import { useMemo } from 'react';
import {
  computeClientSummaries,
  computeGlobalSummary,
  formatCurrency,
  getMonthsFromStart,
  getMonthMontant,
  toNumber,
} from '../utils/calculations';

function BarChart({ data, formatValue }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="dash-chart">
      {data.map((d) => (
        <div key={d.key} className="dash-bar-group" title={`${d.label} : ${formatValue(d.value)}`}>
          <div
            className={`dash-bar ${d.secondary ? 'secondary' : ''}`}
            style={{ height: `${Math.max(3, Math.round((d.value / max) * 140))}px` }}
          />
          <span className="dash-bar-label">{d.shortLabel}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ clients }) {
  const normalized = useMemo(() => clients || [], [clients]);

  const global = useMemo(() => computeGlobalSummary(normalized), [normalized]);
  const perClient = useMemo(() => computeClientSummaries(normalized), [normalized]);

  // CA par mois : agrégation de tous les clients.
  const monthly = useMemo(() => {
    const map = new Map();
    for (const client of normalized) {
      for (const { key, label } of getMonthsFromStart(client.startDate, client.endDate)) {
        const amount = getMonthMontant(client, key);
        if (!map.has(key)) map.set(key, { key, label, value: 0 });
        map.get(key).value += amount;
      }
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({
      ...m,
      shortLabel: m.key.slice(2),
    }));
  }, [normalized]);

  // Répartition payé / non payé pour le second graphique.
  const split = useMemo(
    () => [
      { key: 'paid', label: 'Payé', shortLabel: 'Payé', value: toNumber(global.paid) },
      { key: 'unpaid', label: 'Non payé', shortLabel: 'À venir', value: toNumber(global.unpaid), secondary: true },
    ],
    [global],
  );

  const tjmMoyen = useMemo(() => {
    if (!normalized.length) return 0;
    return normalized.reduce((s, c) => s + toNumber(c.tjm), 0) / normalized.length;
  }, [normalized]);

  if (!normalized.length) {
    return (
      <div className="empty-state">
        <p>Aucune donnée à afficher pour le moment.</p>
        <p>Saisissez vos données dans l&apos;application desktop, puis cliquez sur « Enregistrer tout » pour les synchroniser.</p>
      </div>
    );
  }

  return (
    <div className="dash">
      <section className="dash-kpis">
        <div className="dash-kpi">
          <span className="dash-kpi-label">CA total</span>
          <span className="dash-kpi-value">{formatCurrency(global.total)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">Payé</span>
          <span className="dash-kpi-value">{formatCurrency(global.paid)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">Non payé</span>
          <span className="dash-kpi-value">{formatCurrency(global.unpaid)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">TJM moyen</span>
          <span className="dash-kpi-value">{formatCurrency(tjmMoyen)}</span>
        </div>
        <div className="dash-kpi">
          <span className="dash-kpi-label">Clients</span>
          <span className="dash-kpi-value">{normalized.length}</span>
        </div>
      </section>

      <section className="dash-section">
        <h2>Chiffre d&apos;affaires par mois (tous clients)</h2>
        {monthly.length ? (
          <BarChart data={monthly} formatValue={formatCurrency} />
        ) : (
          <p className="dash-empty">Aucun mois renseigné.</p>
        )}
      </section>

      <section className="dash-section">
        <h2>Payé / Non payé</h2>
        <BarChart data={split} formatValue={formatCurrency} />
      </section>

      <section className="dash-section">
        <h2>Par client</h2>
        <div className="dash-clients">
          {perClient.map((c) => (
            <div key={c.id} className="dash-client-card">
              <h3>{c.name}</h3>
              <p>
                Total : <strong>{formatCurrency(c.total)}</strong>
              </p>
              <p>
                Payé : {formatCurrency(c.paid)} · Non payé : {formatCurrency(c.unpaid)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="dash-readonly-note">Version web en lecture seule — la saisie se fait dans l&apos;application desktop.</p>
    </div>
  );
}
