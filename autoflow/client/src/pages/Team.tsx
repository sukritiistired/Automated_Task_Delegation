import { useEffect, useRef, useState } from 'react';
import { api, getImageUrl } from '../utils/api';

/* ─── types / constants ──────────────────────────────────────────────────── */
const ROLES = ['admin', 'developer', 'designer', 'product', 'member', 'contractor'];

const SKILL_OPTIONS = [
  'React','TypeScript','Python','AWS','Figma','UI/UX','Node.js','PostgreSQL',
  'Docker','Machine Learning','Project Management','DevOps','Testing','Mobile',
  'Agile','Scrum','GraphQL','Redis','Kubernetes','Vue','Angular','Swift','Kotlin',
];

const ROLE_STYLE: Record<string,{bg:string;color:string}> = {
  admin:      { bg:'var(--accent-light)',   color:'var(--accent)' },
  developer:  { bg:'var(--cyan-light)',     color:'var(--cyan)' },
  designer:   { bg:'var(--purple-light)',   color:'var(--purple)' },
  product:    { bg:'var(--yellow-light)',   color:'var(--yellow)' },
  contractor: { bg:'var(--orange-light)',   color:'var(--orange)' },
  member:     { bg:'var(--bg-hover)',       color:'var(--text-secondary)' },
};

const emptyUser = {
  username:'', cognitoId:'', role:'member', skills:'', availabilityHours:40, teamId:'',
};

/* ─── component ──────────────────────────────────────────────────────────── */
export default function Team() {
  const [users,        setUsers]        = useState<any[]>([]);
  const [teams,        setTeams]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editUser,     setEditUser]     = useState<any>(null);
  const [form,         setForm]         = useState<any>({ ...emptyUser });
  const [profileFile,  setProfileFile]  = useState<File|null>(null);
  const [profilePreview,setProfilePreview]=useState('');
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [skillInput,   setSkillInput]   = useState('');
  const [showCsv,      setShowCsv]      = useState(false);
  const [csvRows,      setCsvRows]      = useState<any[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult,    setCsvResult]    = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef  = useRef<HTMLInputElement>(null);

  /* ─── load ─────────────────────────────────────────────────────────────── */
  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/users').catch(() => ({ data:[] })),
      api.get('/teams').catch(() => ({ data:[] })),
    ]).then(([u,t]) => {
      setUsers(u.data || []);
      setTeams(t.data || []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  /* ─── modal helpers ─────────────────────────────────────────────────────── */
  const openCreate = () => {
    setEditUser(null);
    setForm({ ...emptyUser });
    setProfileFile(null);
    setProfilePreview('');
    setSkillInput('');
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({
      username:         u.username         || '',
      cognitoId:        u.cognitoId        || '',
      role:             u.role             || 'member',
      skills:           u.skills           || '',
      availabilityHours:u.availabilityHours|| 40,
      teamId:           u.teamId ? String(u.teamId) : '',
    });
    setProfileFile(null);
    setProfilePreview(getImageUrl(u.profilePictureUrl));
    setSkillInput('');
    setShowModal(true);
  };

  /* ─── photo upload ──────────────────────────────────────────────────────── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  /* ─── skills helpers ────────────────────────────────────────────────────── */
  const currentSkills = (): string[] =>
    (form.skills || '').split(',').map((s:string)=>s.trim()).filter(Boolean);

  const addSkill = (s: string) => {
    if (!s.trim()) return;
    const arr = currentSkills();
    if (!arr.includes(s.trim())) {
      setForm({ ...form, skills: [...arr, s.trim()].join(', ') });
    }
    setSkillInput('');
  };

  const removeSkill = (s: string) => {
    setForm({ ...form, skills: currentSkills().filter(x => x !== s).join(', ') });
  };

  /* ─── save ──────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.username.trim()) { alert('Username is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('username',         form.username);
      fd.append('role',             form.role);
      fd.append('skills',           form.skills || '');
      fd.append('availabilityHours',String(form.availabilityHours || 40));
      if (form.teamId) fd.append('teamId', form.teamId);
      if (!editUser) {
        fd.append('cognitoId', form.cognitoId || `user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
      }
      if (profileFile) fd.append('profilePicture', profileFile);

      if (editUser) {
        await api.put(`/users/${editUser.userId}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      } else {
        await api.post('/users', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      }
      setShowModal(false);
      load();
    } catch(err: any) {
      alert(err?.response?.data?.message || 'Failed to save user');
    }
    setSaving(false);
  };

  /* ─── delete ────────────────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this member? This cannot be undone.')) return;
    await api.delete(`/users/${id}`).catch(() => {});
    load();
  };

  /* ─── CSV import ────────────────────────────────────────────────────────── */
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
        const obj: Record<string,string> = {};
        headers.forEach((h,i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      setCsvRows(rows);
      setCsvResult(null);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvRows.length) return;
    setCsvImporting(true);
    try {
      // Map Kaggle columns to our user schema
      const mapped = csvRows.map(row => ({
        username:         (row.job_role || row.username || row.name || `user_${Date.now()}`).toLowerCase().replace(/\s+/g,'_').slice(0,30),
        role:             row.role || 'member',
        skills:           row.skills || row.job_role?.toLowerCase().replace(' ', ',') || '',
        availabilityHours:row.availabilityHours || row.experience_required_years ? Math.min(40, Math.max(20, Number(row.experience_required_years)*3+20)) : 40,
        teamId:           row.teamId || '',
      }));
      const r = await api.post('/users/csv-import', { users: mapped });
      setCsvResult(r.data);
      load();
    } catch(err: any) {
      alert(err?.response?.data?.message || 'Import failed');
    }
    setCsvImporting(false);
  };

  /* ─── filter ────────────────────────────────────────────────────────────── */
  const filtered = users.filter(u => {
    const mS = !search || u.username.toLowerCase().includes(search.toLowerCase())
                       || (u.skills||'').toLowerCase().includes(search.toLowerCase());
    const mR = roleFilter === 'all' || u.role === roleFilter;
    return mS && mR;
  });

  const avgLoad = users.length
    ? Math.round(users.reduce((s,u) => s + (u.workload||0), 0) / users.length) : 0;

  /* ─── render ────────────────────────────────────────────────────────────── */
  if (loading) return <div className="loading"><div className="spinner"/><span>Loading team…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Team Management</div>
          <div className="page-subtitle">
            Manage members · roles · skills · workload for AI task delegation
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => { setCsvRows([]); setCsvResult(null); setShowCsv(true); }}>
            📥 Import CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Member</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Members</div>
            <div className="stat-value" style={{ color:'var(--accent)' }}>{users.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Workload</div>
            <div className="stat-value" style={{ color: avgLoad>80?'var(--red)':'var(--green)' }}>{avgLoad}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Teams</div>
            <div className="stat-value" style={{ color:'var(--cyan)' }}>{teams.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Available Seats</div>
            <div className="stat-value">{Math.max(0, 30-users.length)}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>of 30 licenses</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div className="search-bar" style={{ flex:1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search by name or skill…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="select-control" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Skills & Expertise</th>
                  <th>Workload</th>
                  <th>Active Tasks</th>
                  <th>Avail. h/wk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.member;
                  return (
                    <tr key={u.userId}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <img
                            src={getImageUrl(u.profilePictureUrl)}
                            alt={u.username}
                            style={{ width:36, height:36, borderRadius:10, objectFit:'cover', background:'var(--accent-light)', flexShrink:0 }}
                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff&size=36`; }}
                          />
                          <div>
                            <div style={{ fontWeight:600, fontSize:13.5 }}>{u.username}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>ID {u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background:rs.bg, color:rs.color, border:'none' }}>
                          {u.role || 'member'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3, maxWidth:220 }}>
                          {(u.skills||'').split(',').filter(Boolean).map((s:string) => (
                            <span key={s} className="skill-tag">{s.trim()}</span>
                          ))}
                          {!u.skills && <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ minWidth:120 }}>
                        <div style={{ marginBottom:4, fontSize:12, fontWeight:700,
                          color: u.workload>=90?'var(--red)': u.workload>=70?'var(--orange)':'var(--text-secondary)' }}>
                          {u.workload||0}%
                        </div>
                        <div className="workload-bar" style={{ width:100 }}>
                          <div
                            className={`workload-fill ${u.workload>=90?'workload-critical':u.workload>=70?'workload-high':u.workload>=40?'workload-mid':'workload-low'}`}
                            style={{ width:`${u.workload||0}%` }}
                          />
                        </div>
                      </td>
                      <td style={{ fontSize:13, color:'var(--text-secondary)', textAlign:'center' }}>
                        {u.activeTaskCount||0}
                      </td>
                      <td style={{ fontSize:13, color:'var(--text-secondary)', textAlign:'center' }}>
                        {u.availabilityHours||40}h
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(u)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(u.userId)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <p>No members found</p>
                        <span>Try adjusting your search or filters</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Add / Edit modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editUser?'Edit Member':'Add New Member'}</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Profile photo */}
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <label className="avatar-upload" style={{ cursor:'pointer' }}>
                  <img
                    src={profilePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.username||'User')}&background=6366f1&color=fff&size=80`}
                    alt="profile"
                    style={{ width:80, height:80, borderRadius:12, objectFit:'cover', display:'block' }}
                    onError={e=>{ (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=80`; }}
                  />
                  <div className="avatar-upload-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                  <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoChange} style={{ display:'none' }}/>
                </label>
                <div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>Profile Photo</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>Click photo to upload from device</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>JPG, PNG or GIF — max 5 MB</div>
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Username <span style={{ color:'var(--red)' }}>*</span></label>
                  <input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="john_doe"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                    {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Team</label>
                  <select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})}>
                    <option value="">— No Team —</option>
                    {teams.map(t=><option key={t.id} value={String(t.id)}>{t.teamName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Availability (h/week)</label>
                  <input type="number" min={1} max={80} value={form.availabilityHours} onChange={e=>setForm({...form,availabilityHours:Number(e.target.value)})}/>
                </div>
              </div>

              {/* Skills */}
              <div className="form-group">
                <label className="form-label">Skills <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(used for AI delegation scoring)</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8, minHeight:28 }}>
                  {currentSkills().map(s=>(
                    <span key={s} className="skill-tag" style={{ cursor:'pointer' }} onClick={()=>removeSkill(s)}>
                      {s} <span style={{ opacity:.6, marginLeft:2 }}>×</span>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    value={skillInput}
                    onChange={e=>setSkillInput(e.target.value)}
                    placeholder="Type a skill and press Enter or Add…"
                    onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addSkill(skillInput);} }}
                    style={{ flex:1 }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={()=>addSkill(skillInput)}>Add</button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
                  {SKILL_OPTIONS.map(s=>(
                    <button key={s} className="filter-chip" style={{ fontSize:11 }}
                      onClick={()=>addSkill(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Cognito ID <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(optional)</span></label>
                  <input value={form.cognitoId} onChange={e=>setForm({...form,cognitoId:e.target.value})} placeholder="Auto-generated if empty"/>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving||!form.username.trim()}>
                {saving ? '⟳ Saving…' : editUser ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import modal ─────────────────────────────────────────── */}
      {showCsv && (
        <div className="modal-overlay" onClick={()=>setShowCsv(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📥 Import Users from CSV</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowCsv(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="info-box">
                <strong>Supported columns:</strong> username, role, skills, availabilityHours, teamId<br/>
                <strong>Kaggle columns also work:</strong> job_role, experience_required_years<br/>
                A sample file <code>sample_users.csv</code> is included in <code>client/public/</code>
              </div>

              <div
                className="csv-drop"
                onClick={()=>csvRef.current?.click()}
              >
                <input ref={csvRef} type="file" accept=".csv,.tsv" style={{ display:'none' }} onChange={handleCsvChange}/>
                {csvRows.length === 0 ? (
                  <>
                    <div style={{ fontSize:40, marginBottom:8 }}>📄</div>
                    <p style={{ fontWeight:600 }}>Click to upload CSV file</p>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                      Supports Kaggle AI Automation Risk dataset format
                    </span>
                  </>
                ) : (
                  <div onClick={e=>e.stopPropagation()}>
                    <div style={{ fontWeight:700, color:'var(--green)', marginBottom:8 }}>
                      ✓ {csvRows.length} rows loaded
                    </div>
                    <div className="table-wrap" style={{ maxHeight:180, overflow:'auto' }}>
                      <table>
                        <thead>
                          <tr>{Object.keys(csvRows[0]||{}).slice(0,4).map(k=><th key={k}>{k}</th>)}</tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(0,4).map((row,i)=>(
                            <tr key={i}>
                              {Object.values(row).slice(0,4).map((v:any,j)=>(
                                <td key={j} style={{ fontSize:11 }}>{String(v).slice(0,25)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {csvRows.length>4&&<div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>…and {csvRows.length-4} more</div>}
                  </div>
                )}
              </div>

              {csvResult && (
                <div className="delegate-result">
                  <strong>✓ {csvResult.created} users imported successfully!</strong>
                  {csvResult.errors?.length>0 && (
                    <div style={{ marginTop:6, fontSize:12 }}>{csvResult.errors.length} rows had errors</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>{ setShowCsv(false); setCsvRows([]); setCsvResult(null); }}>Close</button>
              <button className="btn btn-primary" onClick={handleCsvImport} disabled={csvImporting||csvRows.length===0}>
                {csvImporting ? '⟳ Importing…' : `Import ${csvRows.length} Users`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
