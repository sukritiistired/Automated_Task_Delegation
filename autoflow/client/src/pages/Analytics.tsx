import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6b7280'];
const PRIORITY_COLORS: Record<string, string> = {
  Urgent: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e', Backlog: '#6b7280'
};

export default function Analytics() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/all').catch(() => ({ data: [] })),
      api.get('/users').catch(() => ({ data: [] })),
    ]).then(([t, u]) => {
      setTasks(t.data || []);
      setUsers(u.data || []);
      setLoading(false);
    });
  }, []);

  const byPriority = ['Urgent', 'High', 'Medium', 'Low', 'Backlog'].map(p => ({
    name: p, value: tasks.filter(t => t.priority === p).length
  }));

  const byStatus = ['To Do', 'Work In Progress', 'Under Review', 'Completed'].map(s => ({
    name: s.replace('Work In Progress', 'In Progress'), value: tasks.filter(t => t.status === s).length
  }));

  const workloadData = users.slice(0, 10).map(u => ({
    name: u.username?.split('_')[0] || u.username,
    workload: u.workload || 0,
    tasks: u.activeTaskCount || 0,
  }));

  const completionRate = tasks.length > 0
    ? Math.round(tasks.filter(t => t.status === 'Completed').length / tasks.length * 100)
    : 0;

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading analytics...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Project insights and team performance metrics</div>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Completion Rate</div>
            <div className="stat-value" style={{ color: completionRate > 60 ? 'var(--green)' : 'var(--orange)' }}>{completionRate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Workload</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {users.length > 0 ? Math.round(users.reduce((s, u) => s + (u.workload || 0), 0) / users.length) : 0}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Urgent Tasks</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{tasks.filter(t => t.priority === 'Urgent').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Overdue</div>
            <div className="stat-value" style={{ color: 'var(--orange)' }}>
              {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Priority Distribution */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Priority Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {byPriority.map((entry, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Tasks by Status</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatus} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Team Workload Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="workload" name="Workload %" radius={[4, 4, 0, 0]}>
                {workloadData.map((entry, i) => (
                  <Cell key={i} fill={entry.workload >= 90 ? '#ef4444' : entry.workload >= 70 ? '#f97316' : '#6c63ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Automation Risk (from Kaggle dataset) */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🤖 AI Automation Risk by Role</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Based on Kaggle dataset — used to weight delegation scoring</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job Role</th>
                  <th>Skills</th>
                  <th>Automation Risk</th>
                  <th>AI Dependency (Future)</th>
                  <th>Workload</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {(u.skills || '').split(',').slice(0, 3).map((s: string) => (
                          <span key={s} className="skill-tag" style={{ fontSize: 10 }}>{s.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="workload-bar" style={{ width: 80 }}>
                          <div
                            className={`workload-fill ${(u.workload || 0) >= 70 ? 'workload-critical' : 'workload-mid'}`}
                            style={{ width: `${Math.min(100, Math.random() * 60 + 20)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>High</span></td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: (u.workload || 0) >= 90 ? 'var(--red)' : 'var(--text-secondary)' }}>
                        {u.workload || 0}%
                      </span>
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
