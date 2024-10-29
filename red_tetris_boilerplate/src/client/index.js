// index.js

import React from 'react';
import ReactDom from 'react-dom';
import { createRoot } from 'react-dom/client';
import createLogger from 'redux-logger';
import { thunk } from 'redux-thunk'; // Corrigé ici
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { storeStateMiddleWare } from './middleware/storeStateMiddleWare';
import reducer from './reducers';
import App from './containers/app';
import { alert } from './actions/alert';

const initialState = {};

// Création du store Redux
const store = createStore(
  reducer,
  initialState,
  applyMiddleware(thunk, createLogger())
);

// Récupération de l'élément DOM cible
const rootElement = document.getElementById('tetris');

// Utilisation de createRoot au lieu de ReactDOM.render pour React 18+
const root = createRoot(rootElement);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);

// Envoi d'une action pour afficher une alerte
store.dispatch(alert('Soon, will be here a fantastic Tetris ...'));

