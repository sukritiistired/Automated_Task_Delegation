import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low', 'Backlog'];
const STATUSES   = ['To Do', 'Work In Progress', 'Under Review', 'Completed'];
const PRESET_TAGS = ['frontend', 'backend', 'design', 'bug', 'feature', 'enhancement', 'documentation', 'testing', 'devops', 'urgent'];

const P_COLOR: Record<string,string> = {
  Urgent:'#ef4444', High:'#f97316', Medium:'#eab308', Low:'#22c55e', Backlog:'#6b7280'
};

const fresh = () => ({
  title:'', description:'', status:'To Do', priority:'Medium',
  tags:'', startDate:'', dueDate:'', points:'', projectId:'1',
  authorUserId:'1', assignedUserId:'', assigneeCount:1,
});

function PriorityDot({ p }:{ p:string }) {
  return <span style={{ width:8, height:8, borderRadius:'50%', background:P_COLOR[p], display:'inline-block', marginRight:5, flexShrink:0 }} />;
}

export default function Board() {
  const [tasks,      setTasks]      = useState<any[]>([]);
  const [users,      setUsers]      = useState<any[]>([]);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [projFilter, setProjFilter] = useState<string>('all');
  const [statFilter, setStatFilter] = useState<string>('all');
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editTask,   setEditTask]   = useState<any>(null);
  const [form,       setForm]       = useState<any>(fresh());
  const [saving,     setSaving]     = useState(false);
  const [delegating, setDelegating] = useState<number|null>(null);
  const [delegResult,setDelegResult]= useState<any>(null);
  const [error,      setError]      = useState('');
  const [tagSearch,  setTagSearch]  = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, u, p] = await Promise.all([
        api.get('/tasks/all'),
        api.get('/users'),
        api.get('/projects'),
      ]);
      setTasks(t.data   || []);
      setUsers(u.data   || []);
      setProjects(p.data|| []);
    } catch(e) { console.error('Load error:', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = (priority?: string) => {
    setEditTask(null);
    const pid = projFilter !== 'all' ? projFilter : (projects[0] ? String(projects[0].id) : '1');
    setForm({ ...fresh(), priority: priority || 'Medium', projectId: pid });
    setError('');
    setDelegResult(null);
    setShowModal(true);
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setForm({
      title:          task.title          || '',
      description:    task.description    || '',
      status:         task.status         || 'To Do',
      priority:       task.priority       || 'Medium',
      tags:           task.tags           || '',
      startDate:      task.startDate      ? task.startDate.split('T')[0] : '',
      dueDate:        task.dueDate        ? task.dueDate.split('T')[0]   : '',
      points:         task.points         !== undefined ? String(task.points) : '',
      projectId:      String(task.projectId    || 1),
      authorUserId:   String(task.authorUserId || 1),
      assignedUserId: task.assignedUserId ? String(task.assignedUserId) : '',
      assigneeCount:  task.assigneeCount || 1,
    });
    setError('');
    setDelegResult(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string,any> = {
        title:          form.title.trim(),
        description:    form.description || null,
        status:         form.status,
        priority:       form.priority,
        tags:           form.tags || null,
        startDate:      form.startDate  || null,
        dueDate:        form.dueDate    || null,
        points:         form.points !== '' ? Number(form.points) : null,
        projectId:      Number(form.projectId || 1),
        authorUserId:   Number(form.authorUserId || 1),
        assignedUserId: form.assignedUserId ? Number(form.assignedUserId) : null,
        assigneeCount:  Number(form.assigneeCount || 1),
      };

      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowModal(false);
      load();
    } catch(err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save task';
      setError(`${msg}. Make sure server is running on port 8000.`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); } catch {}
    load();
  };

  /**
   * UPDATED handleDelegate:
   * 1. Runs AI delegation logic.
   * 2. Sends notification to a SINGLE email address in n8n.
   * 3. Ignores calendar logic to avoid the 403 Forbidden error.
   */
  const handleDelegate = async (taskId: number, count: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDelegating(taskId);
    setDelegResult(null);

    const taskData = tasks.find(t => t.id === taskId);

    try {
      // 1. Trigger Local AI Delegation (Server-side)
      const r = await api.post(`/tasks/${taskId}/delegate`, { count });
      const delegationData = r.data;
      setDelegResult({ ...delegationData, taskId });
      
      // 2. Trigger n8n (Hardcoded email for testing)
      await fetch('http://localhost:5678/webhook/task-assigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'task_assigned',
          recipientEmail: 'sukritibaryal23@gmail.com', 
          taskTitle: taskData?.title || 'New Task',
          assignedTo: delegationData.assignedTo?.username || 'Team',
          reason: delegationData.reason || 'AI Optimized assignment.'
        }),
      }).catch(err => console.warn("n8n Hook failed:", err));

      load();
    } catch(err: any) {
      alert(err?.response?.data?.message || 'Delegation failed');
    }
    setDelegating(null);
  };

  const visible = tasks.filter(t => {
    const mP = projFilter === 'all' || String(t.projectId) === projFilter;
    const mS = statFilter === 'all' || t.status === statFilter;
    const mQ = !search
      || t.title.toLowerCase().includes(search.toLowerCase())
      || (t.tags || '').toLowerCase().includes(search.toLowerCase());
    return mP && mS && mQ;
  });

  const allTags = Array.from(new Set([
    ...PRESET_TAGS,
    ...tasks.flatMap(t => (t.tags || '').split(',').map((tag: string) => tag.trim()).filter(Boolean))
  ])).sort();

  const filteredTags = allTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()));

  const toggleTag = (tag: string) => {
    const currentTags = form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    if (currentTags.includes(tag)) {
      setForm({ ...form, tags: currentTags.filter((t: string) => t !== tag).join(', ') });
    } else {
      setForm({ ...form, tags: [...currentTags, tag].join(', ') });
    }
  };

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading board…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Board</div>
          <div className="page-subtitle">
            {visible.length} tasks across all priorities — AI-powered delegation
          </div>
        </div>
        <div className="page-actions">
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search tasks or tags…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="select-control" value={projFilter} onChange={e=>setProjFilter(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select className="select-control" value={statFilter} onChange={e=>setStatFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>openCreate()}>
            + Add Task
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="board-columns">
          {PRIORITIES.map(pri => {
            const col = visible.filter(t => (t.priority || 'Backlog') === pri);
            return (
              <div key={pri} className="board-col"
                style={{ borderTop: `3px solid ${P_COLOR[pri]}`, minWidth: 280, flexShrink: 0 }}>

                <div className="board-col-header">
                  <span style={{ display:'flex', alignItems:'center', fontWeight:700, fontSize:13.5, color: P_COLOR[pri] }}>
                    <PriorityDot p={pri}/>{pri}
                  </span>
                  <span className="board-col-count">{col.length}</span>
                </div>

                {col.length === 0 && (
                  <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:12 }}>
                    No {pri.toLowerCase()} tasks
                  </div>
                )}

                {col.map(task => (
                  <div key={task.id} className="task-card" onClick={() => openEdit(task)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <span className={`badge badge-${pri.toLowerCase()}`} style={{ display:'flex', alignItems:'center' }}>
                        <PriorityDot p={pri}/>{pri}
                      </span>
                      <button
                        className="btn btn-ghost"
                        style={{ padding:'1px 6px', fontSize:12, lineHeight:1, opacity:.45 }}
                        onClick={e => handleDelete(task.id, e)}
                        title="Delete task"
                      >✕</button>
                    </div>

                    <div style={{ fontWeight:600, fontSize:13.5, lineHeight:1.4, marginBottom:6 }}>
                      {task.title}
                    </div>

                    {task.description && (
                      <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.4, marginBottom:8 }}>
                        {task.description.length > 80 ? task.description.slice(0,80) + '…' : task.description}
                      </div>
                    )}

                    {task.tags && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                        {task.tags.split(',').map((g:string) =>
                          <span key={g} className="skill-tag" style={{ fontSize:10 }}>{g.trim()}</span>
                        )}
                      </div>
                    )}

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span className={`badge status-${(task.status||'todo').replace(/\s+/g,'').toLowerCase()}`}
                        style={{ fontSize:10 }}>
                        {task.status || 'To Do'}
                      </span>
                      {task.assignee && (
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.username)}&background=6366f1&color=fff&size=24`}
                          style={{ width:22, height:22, borderRadius:6 }}
                          title={task.assignee.username} alt=""
                        />
                      )}
                    </div>

                    {task.dueDate && (
                      <div style={{
                        fontSize:11, marginBottom:8,
                        color: (new Date(task.dueDate) < new Date() && task.status !== 'Completed')
                          ? 'var(--red)' : 'var(--text-muted)'
                      }}>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width:'100%', fontSize:11, marginTop:2 }}
                      onClick={e => handleDelegate(task.id, task.assigneeCount || 1, e)}
                      disabled={delegating === task.id}
                    >
                      {delegating === task.id ? '⟳ Delegating…' : '🤖 AI Auto-Delegate'}
                    </button>

                    {delegResult?.taskId === task.id && (
                      <div style={{
                        background:'var(--green-light)',
                        border:'1px solid rgba(34,197,94,.3)',
                        borderRadius:8, padding:'8px 10px', marginTop:8,
                        fontSize:11, color:'var(--text-secondary)', lineHeight:1.4
                      }}>
                        ✓ Assigned to: <strong style={{ color:'var(--green)' }}>
                          {delegResult.assignees?.map((u:any)=>u.username).join(', ')
                           || delegResult.assignedTo?.username || 'assigned'}
                        </strong>
                        <div style={{ marginTop:4, opacity:.7, fontSize:10 }}>{delegResult.reason?.slice(0,80)}</div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width:'100%', marginTop:6, fontSize:12, opacity:.6 }}
                  onClick={() => openCreate(pri)}
                >
                  + Add {pri} Task
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {error && (
                <div style={{
                  background:'var(--red-light)', border:'1px solid rgba(239,68,68,.3)',
                  borderRadius:8, padding:'10px 14px', color:'var(--red)', fontSize:13
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Title <span style={{ color:'var(--red)' }}>*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Add more detail…"
                />
              </div>

              <div className="form-grid form-grid-3">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Story Points</label>
                  <input
                    type="number" min="1" max="100"
                    value={form.points}
                    onChange={e => setForm({ ...form, points: e.target.value })}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}/>
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Project <span style={{ color:'var(--red)' }}>*</span></label>
                  <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                    {projects.length === 0 && <option value="1">Default Project</option>}
                    {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Tags</label>
                  <div 
                    className="form-control" 
                    style={{ minHeight: '38px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: '8px', background: 'var(--bg-secondary)', alignItems: 'center' }}
                    onClick={() => setShowTagDropdown(true)}
                  >
                    {form.tags && form.tags.trim() !== '' ? form.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string) => (
                      <span key={tag} className="skill-tag" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        {tag}
                        <span onClick={(e) => { e.stopPropagation(); toggleTag(tag); }} style={{ cursor: 'pointer', padding: '0 2px', opacity: 0.6 }}>✕</span>
                      </span>
                    )) : <span style={{ color: 'var(--text-muted)' }}>Select tags...</span>}
                  </div>

                  {showTagDropdown && (
                    <>
                      <div 
                        style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                        onClick={(e) => { e.stopPropagation(); setShowTagDropdown(false); }}
                      />
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1000,
                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
                        boxShadow: 'var(--shadow)', maxHeight: '220px',
                        display: 'flex', flexDirection: 'column'
                      }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                          <input
                            autoFocus
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            placeholder="Search tags..."
                            style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                          />
                        </div>
                        <div style={{ overflowY: 'auto', padding: '4px 0' }}>
                          {filteredTags.map(tag => {
                            const isSelected = form.tags && form.tags.split(',').map((t:string)=>t.trim()).includes(tag);
                            return (
                              <div
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                style={{
                                  padding: '8px 12px', cursor: 'pointer', fontSize: '13.5px',
                                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'transparent'}
                              >
                                <span>{tag}</span>
                                {isSelected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                              </div>
                            );
                          })}
                          {filteredTags.length === 0 && (
                            <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No tags found</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Manual Assignee</label>
                  <select value={form.assignedUserId} onChange={e => setForm({ ...form, assignedUserId: e.target.value })}>
                    <option value="">— Leave for AI delegation —</option>
                    {users.map(u => (
                      <option key={u.userId} value={String(u.userId)}>
                        {u.username} — {u.workload || 0}% load
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">AI Delegate to # People</label>
                  <input
                    type="number" min={1} max={users.length || 10}
                    value={form.assigneeCount}
                    onChange={e => setForm({ ...form, assigneeCount: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
              >
                {saving ? '⟳ Saving…' : editTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}