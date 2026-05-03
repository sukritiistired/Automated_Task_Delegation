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
          </>
        )}
        {!user && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>AutoFlow</div>
        )}
      </div>
    </aside>
  );
}
