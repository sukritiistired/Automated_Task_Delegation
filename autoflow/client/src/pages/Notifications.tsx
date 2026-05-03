import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const CURRENT_USER_ID = 1;

const typeConfig: Record<string, { emoji: string; label: string; cls: string }> = {
  task:       { emoji: '📋', label: 'Task',       cls: 'badge-task' },
  system:     { emoji: '⚙️', label: 'System',     cls: 'badge-system' },
  delegation: { emoji: '🤖', label: 'AI Delegate', cls: 'badge-delegation' },
  deadline:   { emoji: '⏰', label: 'Deadline',   cls: 'badge-deadline' },
  update:     { emoji: '✏️', label: 'Update',     cls: 'badge-update' },
  info:       { emoji: 'ℹ️', label: 'Info',       cls: 'badge-info' },
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/notifications/all').then(r => {
      setNotifs(r.data || []);
      setLoading(false);
    }).catch(() => {
      // Fallback to user-specific
      api.get(`/notifications/${CURRENT_USER_ID}`).then(r => {
        setNotifs(r.data || []);
        setLoading(false);
      }).catch(() => { setLoading(false); });
    });
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAll = async () => {
    setMarkingAll(true);
    await api.patch(`/notifications/user/${CURRENT_USER_ID}/read-all`).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const deleteNotif = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const grouped = (() => {
    const filtered = filter === 'all' ? notifs : filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs.filter(n => n.type === filter);
    const today: any[] = [], yesterday: any[] = [], older: any[] = [];
    const now = new Date();
    filtered.forEach(n => {
      const d = new Date(n.createdAt);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
      if (diff < 24) today.push(n);
      else if (diff < 48) yesterday.push(n);
      else older.push(n);
    });
    return { today, yesterday, older };
  })();

  const unreadCount = notifs.filter(n => !n.isRead).length;

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading notifications...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">Stay updated with your latest project activity</div>
        </div>
        <div className="page-actions">
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAll} disabled={markingAll}>
              {markingAll ? 'Marking...' : `Mark all as read (${unreadCount})`}
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* n8n automation info */}
        <div className="info-box" style={{ marginBottom: 20 }}>
          <strong>🔗 n8n Workflow Automation</strong> — AutoFlow automatically triggers webhooks to n8n for task assignments, delegations, and deadline alerts. Configure your webhook URL in <code>server/.env</code> under <code>N8N_WEBHOOK_URL</code>. See the setup guide below for creating n8n workflows.
        </div>

        {/* Filter chips */}
        <div className="filter-chips" style={{ marginBottom: 20 }}>
          {[
            { key: 'all', label: `All (${notifs.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'task', label: '📋 Tasks' },
            { key: 'delegation', label: '🤖 AI Delegations' },
            { key: 'deadline', label: '⏰ Deadlines' },
            { key: 'system', label: '⚙️ System' },
          ].map(f => (
            <button key={f.key} className={`filter-chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {Object.entries(grouped).map(([period, items]) => {
          if (!items.length) return null;
          return (
            <div key={period} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                {period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : 'Older'}
              </div>
              <div className="card" style={{ padding: 8 }}>
                {(items as any[]).map((n: any) => {
                  const tc = typeConfig[n.type] || typeConfig.info;
                  return (
                    <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {tc.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</span>
                          <span className={`badge ${tc.cls}`}>{tc.label}</span>
                          {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', marginLeft: 'auto' }} />}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                        {n.user && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>User: {n.user.username}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 8px', opacity: 0.5 }}
                        onClick={e => deleteNotif(n.id, e)}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {notifs.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <p>No notifications yet</p>
            <span>Notifications appear when tasks are assigned, delegated, or deadlines approach</span>
          </div>
        )}

        {/* n8n Setup Guide */}
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>📖 n8n Workflow Setup Guide</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Step 1:</strong> Install n8n: <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>npx n8n</code> or <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>npm install -g n8n && n8n start</code></div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Step 2:</strong> Open n8n at <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:5678</code></div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Step 3:</strong> Create a new workflow → Add a "Webhook" trigger node → Copy the webhook URL</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Step 4:</strong> Paste the URL into <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>server/.env</code> as <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>N8N_WEBHOOK_URL</code></div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Step 5:</strong> Add downstream nodes: Send Email, Slack message, create calendar event, etc.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Events triggered:</strong> <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>task_assigned</code>, <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>task_delegated</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
