import { useState } from 'react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: '20px',
      width: '100%'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: 'var(--shadow)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ margin: '0 auto 16px', width: '56px', height: '56px', fontSize: '24px' }}>AF</div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to AutoFlow Pro Workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid gap-4" style={{ marginTop: '8px' }}>
          {error && <div style={{ color: 'var(--red)', background: 'var(--red-light)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '12px', fontSize: '15px' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
