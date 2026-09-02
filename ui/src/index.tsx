import ReactDOM from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import './index.css';
import App from './App';
import { createBrowserApplication } from './composition/createBrowserApplication';

applyMode(Mode.Dark);

const application = createBrowserApplication();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App gateway={application.gameClient} />
);
