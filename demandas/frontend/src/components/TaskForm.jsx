import React, { useState, useEffect } from 'react';
import { STATUSES, PRIORITIES } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function TaskForm({ task, onClose, onSave }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const isEdit = !!task;

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: task?.title || '',
    requester: task?.requester || '',
    assignee_id: task?.assignee_id || user.id,
    priority: task?.priority || 'Média',
    deadline: task?.deadline || '',
    status: task?.status || 'Pendente',
    description: task?.description || '',
    what_to_do: task?.what_to_do || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users/all').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.requester || !form.assignee_id) {
      setError('Preencha os campos obrigatórios: Título, Solicitante e Responsável.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/tasks/${task.id}`, form);
      } else {
        await api.post('/tasks', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
      setSaving(false);
    }
  };

  // Statuses available for selection
  const availableStatuses = isAdmin
    ? STATUSES.map(s => s.key)
    : ['Pendente', 'Em andamento', 'Aguardando retorno', 'Aguardando aceite'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Título da demanda *</label>
              <input
                className="form-input"
                placeholder="Ex: Relatório de vendas mensal"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Solicitante *</label>
                <input
                  className="form-input"
                  placeholder="Nome de quem solicitou"
                  value={form.requester}
                  onChange={e => set('requester', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Prazo de entrega</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.deadline}
                  onChange={e => set('deadline', e.target.value)}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Responsável *</label>
                <select
                  className="form-select"
                  value={form.assignee_id}
                  onChange={e => set('assignee_id', parseInt(e.target.value))}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Prioridade</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status / Coluna</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {availableStatuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Resumo / Descrição</label>
              <textarea
                className="form-textarea"
                placeholder="Descreva a demanda com detalhes..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                style={{ minHeight: 90 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">O que precisa ser feito</label>
              <textarea
                className="form-textarea"
                placeholder="Liste as ações necessárias..."
                value={form.what_to_do}
                onChange={e => set('what_to_do', e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>
          </div>

          <div className="modal-body" style={{ paddingTop: 0 }}>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : '✓ Salvar tarefa'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
