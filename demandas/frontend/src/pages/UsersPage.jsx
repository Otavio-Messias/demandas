import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const COLORS = ['#111827','#7c3aed','#0891b2','#dc2626','#16a34a','#d97706','#db2777','#0d9488','#9333ea','#ea580c'];

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', color: COLORS[0] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/users').then(r => { setUsers(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'user', color: COLORS[1] });
    setEditUser(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, color: u.color });
    setEditUser(u);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Nome e email são obrigatórios'); return; }
    if (!editUser && !form.password) { setError('Senha obrigatória para novo usuário'); return; }
    setSaving(true); setError('');
    try {
      if (editUser) {
        const payload = { name: form.name, email: form.email, role: form.role, color: form.color };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (u.id === me.id) return;
    if (!confirm(`Excluir o usuário "${u.name}"? Isso pode afetar tarefas atribuídas a ele.`)) return;
    await api.delete(`/users/${u.id}`);
    load();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar tasks={[]} />

      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Usuários</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{users.length} usuários cadastrados</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Novo usuário</button>
        </div>

        {loading ? <div className="loading">Carregando...</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div className="avatar" style={{ background: u.color, width: 38, height: 38, fontSize: 13 }}>
                  {u.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: u.role === 'admin' ? '#111827' : '#f0f2f5',
                      color: u.role === 'admin' ? 'white' : 'var(--text-2)'
                    }}>{u.role === 'admin' ? 'ADMIN' : 'USUÁRIO'}</span>
                    {u.id === me.id && (
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>(você)</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Editar</button>
                  {u.id !== me.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Excluir</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-msg">{error}</div>}

              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@empresa.com" />
              </div>

              <div className="form-group">
                <label className="form-label">{editUser ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</label>
                <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
              </div>

              <div className="form-group">
                <label className="form-label">Perfil</label>
                <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cor do avatar</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set('color', c)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: 2
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="avatar" style={{ background: form.color, width: 36, height: 36, fontSize: 13 }}>
                  {form.name ? form.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{form.name || 'Nome do usuário'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{form.email || 'email@empresa.com'}</div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : '✓ Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
