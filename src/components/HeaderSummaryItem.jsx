import { useMemo, useState } from 'react';
import { formatCurrency } from '../utils/calculations';

export default function HeaderSummaryItem({
  label,
  total,
  metric,
  clients,
  activeClientId,
  className = '',
  onSelectClient,
  // Tri du détail : par date de contrat (défaut) ou par nom.
  sortByStartDate = true,
}) {
  const [open, setOpen] = useState(false);
  const canSelect = typeof onSelectClient === 'function';

  // Les tooltips affichent toujours les clients du plus ancien au plus récent
  // (date de contrat croissante), comme la barre d'onglets. À montant égal ou
  // date manquante, on retombe sur l'ordre alphabétique.
  const orderedClients = useMemo(() => {
    const timeOf = (client) => {
      const raw = client.startDateSort || client.startDate;
      if (!raw) return NaN;
      const time = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw).getTime();
      return Number.isFinite(time) ? time : NaN;
    };

    return [...(clients || [])].sort((a, b) => {
      if (sortByStartDate) {
        const timeA = timeOf(a);
        const timeB = timeOf(b);
        const validA = Number.isFinite(timeA);
        const validB = Number.isFinite(timeB);
        if (validA && validB && timeA !== timeB) return timeA - timeB;
        if (validA !== validB) return validA ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '', 'fr');
    });
  }, [clients, sortByStartDate]);

  return (
    <span
      className={`header-summary-item ${className} ${open ? 'open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {label} : <strong>{formatCurrency(total)}</strong>

      {open && orderedClients.length > 0 && (
        <div className="header-summary-tooltip" role="tooltip">
          <div className="header-summary-tooltip-title">Détail par client</div>
          <ul>
            {orderedClients.map((client) => (
              <li key={client.id}>
                {canSelect ? (
                  <button
                    type="button"
                    className={
                      client.id === activeClientId ? 'tooltip-client active' : 'tooltip-client'
                    }
                    onClick={() => onSelectClient(client.id)}
                  >
                    <span className="tooltip-client-name">{client.name}</span>
                    <span className="tooltip-client-value">{formatCurrency(client[metric])}</span>
                  </button>
                ) : (
                  <span className="tooltip-client tooltip-client-static">
                    <span className="tooltip-client-name">{client.name}</span>
                    <span className="tooltip-client-value">{formatCurrency(client[metric])}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
