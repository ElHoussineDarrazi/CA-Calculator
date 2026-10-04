import { isClientFullyPaid } from '../utils/calculations';

export default function TabBar({
  clients,
  activeClientId,
  onSelect,
  onAdd,
  onRemove,
  sortCriterion = 'start',
  onSortChange,
}) {
  return (
    <div className="tab-bar">
      {clients.map((client) => (
        <div key={client.id} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className={`tab ${client.id === activeClientId ? 'active' : ''}`}
            onClick={() => onSelect(client.id)}
          >
            {isClientFullyPaid(client) && (
              <span
                className="tab-paid-dot"
                title="Tous les mois sont payés"
                aria-label="Tous les mois sont payés"
              >
                ●
              </span>
            )}
            {client.name || 'Sans nom'}
            {clients.length > 1 && (
              <span
                className="tab-close"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(client.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onRemove(client.id);
                  }
                }}
                title="Supprimer l'onglet"
              >
                ×
              </span>
            )}
          </button>
        </div>
      ))}
      <button type="button" className="tab-add" onClick={onAdd} title="Ajouter un client">
        +
      </button>
      {onSortChange && (
        <label className="tab-sort">
          Trier par
          <select
            value={sortCriterion}
            onChange={(e) => onSortChange(e.target.value)}
            title="Ordre d'affichage des onglets clients"
          >
            <option value="start">Date de contrat</option>
            <option value="end">Date de fin</option>
            <option value="name">Nom (A→Z)</option>
          </select>
        </label>
      )}
    </div>
  );
}
