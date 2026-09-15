import { useState } from 'react';
import { formatCurrency, sortRecuperationsByDate, toNumber } from '../utils/calculations';
import { confirmDelete } from '../utils/confirm';
import { createId } from '../utils/uuid';

export default function RecuperationsPortage({ client, total, onUpdateClient }) {
  const [expanded, setExpanded] = useState(false);
  const entries = sortRecuperationsByDate(client.recuperationsPortage || []);

  const setEntries = (next) => {
    onUpdateClient(client.id, { recuperationsPortage: sortRecuperationsByDate(next) });
  };

  const addEntry = () => {
    setExpanded(true);
    setEntries([
      ...entries,
      {
        id: createId(),
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
      },
    ]);
  };

  const updateEntry = (id, updates) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const removeEntry = (id) => {
    const entry = entries.find((e) => e.id === id);
    const dateLabel = entry?.date
      ? new Date(entry.date).toLocaleDateString('fr-FR')
      : 'cette ligne';
    const amountLabel = entry?.amount ? ` (${formatCurrency(entry.amount)})` : '';

    if (
      !confirmDelete(
        `Supprimer la récupération du ${dateLabel}${amountLabel} ?\n\nCette action est irréversible.`,
      )
    ) {
      return;
    }

    setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <div className={`recuperations-portage ${expanded ? 'expanded' : 'collapsed'}`}>
      <button
        type="button"
        className="recuperations-header recuperations-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="collapse-icon" aria-hidden>
          {expanded ? '▼' : '▶'}
        </span>
        <h3>Récupéré portage</h3>
        <span className="recuperations-total">{formatCurrency(total)}</span>
      </button>

      {expanded && (
        <div className="recuperations-body">
          {entries.length === 0 ? (
            <p className="recuperations-empty">Aucune récupération enregistrée</p>
          ) : (
            <div className="recuperations-table">
              <div className="recuperation-row recuperation-row-header">
                <span>Date</span>
                <span>Montant (€)</span>
                <span />
              </div>
              <ul className="recuperations-list">
                {entries.map((entry) => (
                  <li key={entry.id} className="recuperation-row">
                    <input
                      type="date"
                      value={entry.date || ''}
                      onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                      aria-label="Date de récupération"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.amount || ''}
                      onChange={(e) =>
                        updateEntry(entry.id, { amount: toNumber(e.target.value) })
                      }
                      placeholder="0"
                      aria-label="Montant récupéré"
                    />
                    <button
                      type="button"
                      className="recuperation-remove"
                      onClick={() => removeEntry(entry.id)}
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" className="recuperation-add" onClick={addEntry}>
            + Ajouter une récupération
          </button>
        </div>
      )}
    </div>
  );
}
