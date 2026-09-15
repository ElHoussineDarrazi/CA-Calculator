import {
  formatCurrency,
  getMonthMontant,
  getMonthRestePercent,
  getMonthsFromStart,
  summarizeClient,
  toNumber,
} from '../utils/calculations';
import RecuperationsPortage from './RecuperationsPortage';

export default function ClientPanel({ client, onUpdateClient, onUpdateMonth }) {
  const months = getMonthsFromStart(client.startDate, client.endDate);
  const summary = summarizeClient(client);

  return (
    <div className="client-panel">
      <div className="client-form">
        <div className="form-group">
          <label htmlFor="client-name">Nom du client</label>
          <input
            id="client-name"
            type="text"
            value={client.name}
            onChange={(e) => onUpdateClient(client.id, { name: e.target.value })}
            placeholder="Ex: Acme Corp"
          />
        </div>
        <div className="form-group">
          <label htmlFor="start-date">Date de début de mission</label>
          <input
            id="start-date"
            type="date"
            value={client.startDate}
            onChange={(e) => onUpdateClient(client.id, { startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="end-date">Date de fin de mission</label>
          <input
            id="end-date"
            type="date"
            value={client.endDate || ''}
            min={client.startDate || undefined}
            onChange={(e) => onUpdateClient(client.id, { endDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="tjm">TJM (€)</label>
          <input
            id="tjm"
            type="number"
            min="0"
            step="10"
            value={client.tjm || ''}
            onChange={(e) => onUpdateClient(client.id, { tjm: toNumber(e.target.value) })}
            placeholder="500"
          />
        </div>
        <div className="form-group">
          <label htmlFor="commission">Reste en %</label>
          <input
            id="commission"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={client.commissionPercent || ''}
            onChange={(e) =>
              onUpdateClient(client.id, { commissionPercent: Number(e.target.value) })
            }
            placeholder="85"
          />
        </div>
      </div>

      <p className="formula-hint">
        Montant = (TJM × jours travaillés) × reste en % — Total CA = somme des montants de cet onglet
      </p>

      <div className="client-summary">
        <div className="summary-card total">
          <div className="label">Total CA</div>
          <div className="value">{formatCurrency(summary.total)}</div>
        </div>
        <div className="summary-card paid">
          <div className="label">Payé par le client</div>
          <div className="value">{formatCurrency(summary.paid)}</div>
        </div>
        <div className="summary-card unpaid">
          <div className="label">Reste à chez le client</div>
          <div className="value">{formatCurrency(summary.unpaid)}</div>
        </div>
        <div className="summary-card recuperer">
          <div className="label">Récupéré portage</div>
          <div className="value">{formatCurrency(summary.recupererPortage)}</div>
        </div>
        <div className="summary-card reste-portage">
          <div className="label">Reste portage</div>
          <div className="value">{formatCurrency(summary.restePortage)}</div>
        </div>
      </div>

      <p className="formula-hint">
        Reste portage = Payé par le client − Récupéré portage (somme des récupérations)
      </p>

      <RecuperationsPortage
        client={client}
        total={summary.recupererPortage}
        onUpdateClient={onUpdateClient}
      />

      <div className="months-table">
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>Jours travaillés</th>
              <th>Reste en %</th>
              <th>Montant</th>
              <th>Payé par le client</th>
            </tr>
          </thead>
          <tbody>
            {months.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>
                  Définissez une date de début de mission pour afficher les mois
                  {client.endDate && client.startDate && new Date(client.endDate) < new Date(client.startDate)
                    ? ' (la date de fin doit être après la date de début)'
                    : ''}
                </td>
              </tr>
            ) : (
              months.map((month) => {
                const entry = client.months[month.key] || { daysWorked: 0, paid: false };
                const amount = getMonthMontant(client, month.key);
                const restePercent = getMonthRestePercent(client, month.key);

                return (
                  <tr key={month.key} className={entry.paid ? 'paid-row' : 'unpaid-row'}>
                    <td>{month.label}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        step="0.5"
                        value={entry.daysWorked || ''}
                        onChange={(e) =>
                          onUpdateMonth(client.id, month.key, {
                            daysWorked: toNumber(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input-reste-percent"
                        min="0"
                        max="100"
                        step="0.5"
                        value={restePercent || ''}
                        onChange={(e) =>
                          onUpdateMonth(client.id, month.key, {
                            restePercent: Number(e.target.value),
                          })
                        }
                        aria-label={`Reste en % pour ${month.label}`}
                      />
                    </td>
                    <td className="amount">{formatCurrency(amount)}</td>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={entry.paid}
                        onChange={(e) =>
                          onUpdateMonth(client.id, month.key, { paid: e.target.checked })
                        }
                        title="Cocher si le client a payé ce mois"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {months.length > 0 && (
            <tfoot>
              <tr className="total-row">
                <td>Total</td>
                <td />
                <td />
                <td className="amount">{formatCurrency(summary.total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
