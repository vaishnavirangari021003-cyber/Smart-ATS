import { useEffect, useState } from 'react';

const API_HEALTH_URL = '/api/health';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('Checking API connection...');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(API_HEALTH_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as { ok?: boolean };
        setStatus(data.ok ? 'ok' : 'error');
        setMessage(data.ok ? 'API is healthy and responding.' : 'API responded without the expected payload.');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unknown API error');
      }
    };

    void fetchHealth();
  }, []);

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">ATS workspace</p>
        <h1>Application running</h1>
        <p className="subtitle">The frontend is connected to the API and the project is booted successfully.</p>

        <div className={`status ${status}`} aria-live="polite">
          <span className="dot" />
          {status === 'loading' ? 'Checking' : status === 'ok' ? 'Healthy' : 'Error'}
        </div>

        <p className="message">{message}</p>
      </section>
    </main>
  );
}
