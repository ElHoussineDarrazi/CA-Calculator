import React from 'react';
import ReactDOM from 'react-dom/client';
import WebApp from './components/WebApp';
import './index.css';

/**
 * Point d'entrée WEB (GitHub Pages, `VITE_WEB_READONLY=true`, voir
 * `web.html` + `vite.config.js`) : tableau de bord en lecture seule.
 * Ce module n'importe JAMAIS `App` : le bundle web ne contient aucun écran
 * ni aucune logique d'édition — uniquement graphiques + indicateurs clés.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>,
);
