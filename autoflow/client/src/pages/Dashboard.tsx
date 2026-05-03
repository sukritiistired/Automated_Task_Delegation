import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const priorityColors: Record<string, string> = {
  Urgent: 'var(--red)', High: 'var(--orange)', Medium: 'var(--yellow)', Low: 'var(--green)', Backlog: 'var(--text-muted)'
};

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/tasks/all').catch(() => ({ data: [] })),
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/projects').catch(() => ({ data: [] })),
    ]).then(([t, u, p]) => {
      setTasks(t.data || []);
      setUsers(u.data || []);
      setProjects(p.data || []);
      setLoading(false);
    });
  }, []);

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length;
  const urgent = tasks.filter(t => t.priority === 'Urgent').length;

  const byPriority = ['Urgent','High','Medium','Low','Backlog'].map(p => ({
    priority: p, count: tasks.filter(t => t.priority === p).length
  }));

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading AutoFlow...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Managing {projects.length} projects · {tasks.length} total tasks this sprint</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/board')}>View Board</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/board')}>+ New Task</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{tasks.length}</div>
            <div className="stat-change up">↑ All projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{completed}</div>
            <div className="stat-change up">↑ {tasks.length > 0 ? Math.round(completed/tasks.length*100) : 0}% rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overdue</div>
            <div className="stat-value" style={{ color: overdue > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>{overdue}</div>
            <div className={`stat-change ${overdue > 0 ? 'down' : 'up'}`}>{overdue > 0 ? '↓ Needs attention' : '✓ On track'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Team Members</div>
            <div className="stat-value" style={{ color: 'var(--cyan)' }}>{users.length}</div>
            <div className="stat-change up">↑ Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Urgent Tasks</div>
            <div className="stat-value" style={{ color: urgent > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>{urgent}</div>
            <div className={`stat-change ${urgent > 0 ? 'down' : 'up'}`}>{urgent > 0 ? '! Requires action' : '✓ All clear'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Priority breakdown */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Tasks by Priority</div>
            {byPriority.map(({ priority, count }) => (
              <div key={priority} style={{ marginBottom: 12 }}>
                <div className="flex items-center justify-between mb-1" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: priorityColors[priority] }}>{priority}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{count}</span>
                </div>
                <div className="workload-bar">
                  <div
                    className="workload-fill"
                    style={{
                      width: tasks.length ? `${count/tasks.length*100}%` : '0%',
                      background: priorityColors[priority]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Team workload */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>Team Workload</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/team')}>Manage →</button>
            </div>
            {users.slice(0,6).map((u: any) => (
              <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img
                  src={`https://ui-avatars.com/api/?name=${u.username}&background=6366f1&color=fff&size=28`}
                  style={{ width: 28, height: 28, borderRadius: 8 }}
                  alt=""
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{u.username}</div>
                  <div className="workload-bar">
                    <div
                      className={`workload-fill ${u.workload >= 90 ? 'workload-critical' : u.workload >= 70 ? 'workload-high' : u.workload >= 40 ? 'workload-mid' : 'workload-low'}`}
                      style={{ width: `${u.workload || 0}%` }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: u.workload >= 90 ? 'var(--red)' : u.workload >= 70 ? 'var(--orange)' : 'var(--text-muted)', minWidth: 32 }}>
                  {u.workload || 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>Recent Tasks</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/board')}>View all →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0,8).map((task: any) => (
                  <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/board')}>
                    <td style={{ fontWeight: 600, maxWidth: 280 }}><span className="truncate" style={{ display: 'block' }}>{task.title}</span></td>
                    <td><span className={`badge badge-${(task.priority||'backlog').toLowerCase()}`}>{task.priority || 'Backlog'}</span></td>
                    <td><span className={`badge status-${(task.status||'todo').replace(/\s+/g,'').toLowerCase()}`}>{task.status || 'To Do'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee?.username || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
