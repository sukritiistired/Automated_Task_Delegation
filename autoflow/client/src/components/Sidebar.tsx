import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, getImageUrl } from '../utils/api';

const CURRENT_USER_ID = 1;

const navItems = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/board', icon: '◫', label: 'Board' },
  { path: '/projects', icon: '❏', label: 'Projects' },
  { path: '/team', icon: '◎', label: 'Team' },
  { path: '/analytics', icon: '∿', label: 'Analytics' },
  { path: '/notifications', icon: '◉', label: 'Notifications', badge: true },
  { path: '/settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.get(`/notifications/${CURRENT_USER_ID}`).then(r => {
      const unread = r.data.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    }).catch(() => {});
    api.get('/users').then(r => {
      if (r.data.length > 0) setUser(r.data[0]);
    }).catch(() => {});
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">AF</div>
          <div>
            <div className="logo-text">AutoFlow</div>
            <div className="logo-sub">Pro Workspace</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-label">Main</div>
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
              {item.badge && unreadCount > 0 && (
                <span className="nav-badge red">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-user">
        {user && (
          <>
            <img
              src={getImageUrl(user.profilePictureUrl)}
              alt={user.username}
              className="user-avatar"
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff`; }}
            />
            <div className="user-info">
              <div className="user-name">{user.username}</div>
              <div className="user-role">{user.role || 'member'}</div>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                sessionStorage.removeItem('isAuthenticated');
                window.location.reload();
              }}
              title="Logout"
              style={{ padding: '4px', minWidth: 'auto' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </>
        )}
        {!user && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, flex: 1 }}>AutoFlow</div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                sessionStorage.removeItem('isAuthenticated');
                window.location.reload();
              }}
              title="Logout"
              style={{ padding: '4px', minWidth: 'auto' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
