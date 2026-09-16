/**
 * Tableau de bord en lecture seule (version web déployée).
 *
 * Affiche les mêmes indicateurs que l'application desktop
 * (voir `App.jsx` : Total CA, Payé, Reste à facturer, Récupéré portage,
 * Reste portage — calculés par `computeGlobalSummary` / `computeClientSummaries`),
 * avec le même détail par client au survol. S'y ajoutent uniquement des
 * compléments visuels (Payé / Non payé, cartes par client).
 *
 * AUCUN bouton Modifier / Enregistrer / Importer, AUCUNE écriture.
 */
import { useMemo } from 'react';
import {
  computeClientSummaries,
  computeGlobalSummary,
  formatCurrency,
  toNumber,
} from '../utils/calculations';
import HeaderSummaryItem from './HeaderSummaryItem';

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

  // Répartition payé / non payé pour le graphique complémentaire.
  const split = useMemo(
    () => [
      { key: 'paid', label: 'Payé', shortLabel: 'Payé', value: toNumber(global.paid) },
      { key: 'unpaid', label: 'Non payé', shortLabel: 'À venir', value: toNumber(global.unpaid), secondary: true },
    ],
    [global],
  );

  // Les 5 mêmes indicateurs que le header desktop (App.jsx), avec le même
  // détail par client au survol — en lecture seule (pas de navigation).
  const indicators = [
    { label: 'Total CA', total: global.total, metric: 'total' },
    { label: 'Payé', total: global.paid, metric: 'paid' },
    { label: 'Reste à facturer', total: global.unpaid, metric: 'unpaid' },
    { label: 'Récupéré portage', total: global.recupererPortage, metric: 'recupererPortage' },
    { label: 'Reste portage', total: global.restePortage, metric: 'restePortage' },
  ];

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
      <section className="dash-indicators" aria-label="Indicateurs (identiques à l'application desktop)">
        {indicators.map((item) => (
          <HeaderSummaryItem
            key={item.metric}
            label={item.label}
            total={item.total}
            metric={item.metric}
            clients={perClient}
          />
        ))}
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
