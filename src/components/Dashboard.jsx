/**
 * Tableau de bord en lecture seule (version web déployée).
 *
 * Affiche les mêmes indicateurs que l'application desktop
 * (voir `App.jsx` : Total CA, Payé, Reste à facturer, Récupéré portage,
 * Reste portage — calculés par `computeGlobalSummary` / `computeClientSummaries`),
 * avec le même détail par client au survol. S'y ajoute le détail par client
 * (total, payé / non payé, récupéré / reste à récupérer).
 *
 * AUCUN bouton Modifier / Enregistrer / Importer, AUCUNE écriture.
 */
import { useMemo } from 'react';
import {
  computeClientSummaries,
  computeGlobalSummary,
  formatCurrency,
} from '../utils/calculations';
import HeaderSummaryItem from './HeaderSummaryItem';

export default function Dashboard({ clients }) {
  const normalized = useMemo(() => clients || [], [clients]);

  const global = useMemo(() => computeGlobalSummary(normalized), [normalized]);
  const perClient = useMemo(() => computeClientSummaries(normalized), [normalized]);

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
              <p>
                Récupéré : {formatCurrency(c.recupererPortage)} · Reste à récupérer :{' '}
                {formatCurrency(c.restePortage)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="dash-readonly-note">Version web en lecture seule — la saisie se fait dans l&apos;application desktop.</p>
    </div>
  );
}
