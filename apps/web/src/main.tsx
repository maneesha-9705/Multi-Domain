import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { useAppStore } from './store/useAppStore';
import { Lobby } from './features/lobby/Lobby';
import { MainView } from './MainView';

const App = () => {
  const { connected } = useAppStore();
  return connected ? <MainView /> : <Lobby />;
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
