import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthGate from './components/AuthGate';
import './index.css';

/**
 * Point d'entrée DESKTOP (et `npm run dev`) : application complète d'édition.
 * La version web en lecture seule a son propre point d'entrée `src/web.jsx`
 * (voir `web.html` + `vite.config.js`) : les deux bundles ne partagent aucun
 * code d'interface — le bundle web ne contient ni formulaire ni bouton
 * d'enregistrement.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>{(authUser) => <App authUser={authUser} />}</AuthGate>
  </React.StrictMode>,
);

