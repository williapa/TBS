import ReactDOM from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import './index.css';
import App from './App';
import { createBrowserApplication } from './composition/createBrowserApplication';
import { IdentityGate } from './multiplayer';

const application = createBrowserApplication();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <IdentityGate identityProvider={application.identity}>
    <App gateway={application.gameClient} />
  </IdentityGate>
);
