export default function TabBar({ clients, activeClientId, onSelect, onAdd, onRemove }) {
  return (
    <div className="tab-bar">
      {clients.map((client) => (
        <div key={client.id} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className={`tab ${client.id === activeClientId ? 'active' : ''}`}
            onClick={() => onSelect(client.id)}
          >
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
    </div>
  );
}
