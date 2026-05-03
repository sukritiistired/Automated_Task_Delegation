import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const emptyProject = { name: '', description: '', startDate: '', endDate: '' };

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyProject });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/projects')
      .then(r => { setProjects(r.data || []); setLoading(false); })
      .catch(() => { setProjects([]); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditProject(null);
    setForm({ ...emptyProject });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditProject(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      startDate: p.startDate ? p.startDate.split('T')[0] : '',
      endDate: p.endDate ? p.endDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Project Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (editProject) {
        await api.put(`/projects/${editProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      setShowModal(false);
      load();
    } catch(err: any) {
      alert(err?.response?.data?.message || 'Failed to save project');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this project? All associated tasks will also be deleted!')) return;
    await api.delete(`/projects/${id}`).catch(() => {});
    load();
  };

  const filtered = projects.filter(p => 
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description||'').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading projects…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">Manage all active projects and workspaces</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>+ Add Project</button>
        </div>
      </div>

      <div className="page-body">
        {/* Search */}
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div className="search-bar" style={{ flex:1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search projects…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Description</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.description || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(p)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <p>No projects found</p>
                        <span>Add a new project to get started</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editProject?'Edit Project':'Add New Project'}</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Project Name <span style={{ color:'var(--red)' }}>*</span></label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Website Redesign"/>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description of the project..."/>
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving||!form.name.trim()}>
                {saving ? '⟳ Saving…' : editProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
