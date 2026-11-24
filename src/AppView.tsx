import { useEffect, useState } from 'react';
import Workspace from './Workspace';
import Shield from './Shield';
import { detectOnDeviceAI } from './services/aiService.js';

/** The product itself: its own navigation, no marketing around it. */
export default function AppView() {
  const [nano, setNano] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  useEffect(() => {
    detectOnDeviceAI().then((d: { available: boolean }) => setNano(d.available ? 'ready' : 'unavailable')).catch(() => setNano('unavailable'));
  }, []);

  return (
    <div className="app">
      <header className="app-nav">
        <a className="logo" href="#top" aria-label="CloakFlow home"><Shield />CloakFlow</a>
        <nav className="app-tabs" aria-label="App">
          <a className="tab on" href="#/app" aria-current="page">Workspace</a>
          <a className="tab" href="#how">How it works</a>
          <a className="tab" href="#capabilities">Capabilities</a>
        </nav>
        <div className="app-status" title="Chrome's built-in on-device model, used for offline grammar and summaries when available">
          <i className={`dot ${nano}`} />
          {nano === 'checking' ? 'Checking on-device AI' : nano === 'ready' ? 'On-device AI ready' : 'Built-in local engine'}
        </div>
        <a className="btn btn-ghost btn-sm" href="#top">Back to site</a>
      </header>
      <main className="app-main">
        <div className="app-title">
          <h1>Workspace</h1>
          <p>Paste something private, check what was detected, then process it. Originals never leave this tab.</p>
        </div>
        <Workspace />
      </main>
    </div>
  );
}
