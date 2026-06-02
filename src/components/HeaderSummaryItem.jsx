import { useState } from 'react';
import { formatCurrency } from '../utils/calculations';

export default function HeaderSummaryItem({
  label,
  total,
  metric,
  clients,
  activeClientId,
  className = '',
  onSelectClient,
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`header-summary-item ${className} ${open ? 'open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {label} : <strong>{formatCurrency(total)}</strong>

      {open && clients.length > 0 && (
        <div className="header-summary-tooltip" role="tooltip">
          <div className="header-summary-tooltip-title">Détail par client</div>
          <ul>
            {clients.map((client) => (
              <li key={client.id}>
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
