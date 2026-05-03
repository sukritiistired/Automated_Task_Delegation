import { useState } from 'react';

export default function Settings() {
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678/webhook/autoflow');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure AutoFlow preferences and integrations</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>🔗 n8n Integration</div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Webhook URL</label>
            <input value={n8nUrl} onChange={e => setN8nUrl(e.target.value)} placeholder="http://localhost:5678/webhook/..." />
            <span className="form-hint">Set in server/.env as N8N_WEBHOOK_URL</span>
          </div>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>

        <div className="card" style={{ maxWidth: 640, marginTop: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>⚙️ App Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>App Name:</strong> AutoFlow</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Version:</strong> 2.0.0</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Database:</strong> PostgreSQL via Prisma ORM</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Backend:</strong> Express + TypeScript (port 8000)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Frontend:</strong> React + Vite (port 3000)</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>AI Delegation:</strong> Skill-match + workload scoring algorithm</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dataset:</strong> Kaggle AI Automation Risk by Job Role (3000 rows)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
