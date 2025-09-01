
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import WaiverPortal from './components/WaiverPortal';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const AppRouter: React.FC = () => {
  const [hash, setHash] = React.useState(window.location.hash);

  React.useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (hash === '#/waiver') {
    return <WaiverPortal />;
  }
  return <App />;
};


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);