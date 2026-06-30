import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { STATUSES } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function BoardPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Todas as prioridades');
  const [userFilter, setUserFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const loadTasks = useCallback(() => {
    api.get('/tasks').then(r => {
      setTasks(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
    if (isAdmin) {
      api.get('/users/all').then(r => setUsers(r.data)).catch(() => {});
    }
  }, [loadTasks, isAdmin]);

  // Count active tasks per user (excluding Concluída and Cancelada)
  const taskCountByUser = users.reduce((acc, u) => {
    acc[u.id] = tasks.filter(t =>
      t.assignee_id === u.id &&
      t.status !== 'Concluída' &&
      t.status !== 'Cancelada'
    ).length;
    return acc;
  }, {});

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.requester.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'Todas as prioridades' || t.priority === priorityFilter;
    const matchUser = !isAdmin || userFilter === 'todos' || t.assignee_id === parseInt(userFilter);
    return matchSearch && matchPriority && matchUser;
  });

  const columns = STATUSES.map(s => ({
    ...s,
    tasks: filtered.filter(t => t.status === s.key)
  }));

  const pendingApproval = tasks.filter(t => t.status === 'Aguardando aceite').length;
  const selectedUser = users.find(u => u.id === parseInt(userFilter));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar tasks={tasks} />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 20px',
        background: 'white', borderBottom: '1px solid var(--border)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>🔍</span>
          <input
            className="form-input"
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Priority filter */}
        <select
          className="form-select"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option>Todas as prioridades</option>
          <option>Alta</option>
          <option>Média</option>
          <option>Baixa</option>
          <option>Urgente</option>
        </select>

        {/* User filter (admin only) */}
        {isAdmin && users.length > 0 && (
          <select
            className="form-select"
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="todos">
              Todos os usuários ({tasks.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} ativas)
            </option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({taskCountByUser[u.id] || 0} ativas)
              </option>
            ))}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {isAdmin && pendingApproval > 0 && (
          <span style={{
            fontSize: 12, background: '#f5f3ff', color: '#7c3aed',
            padding: '4px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0
          }}>
            ⏳ {pendingApproval} aguardando aceite
          </span>
        )}

        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>
          + Nova tarefa
        </button>
      </div>

      {/* User filter banner */}
      {isAdmin && selectedUser && (
        <div style={{
          background: selectedUser.color + '18',
          borderBottom: `2px solid ${selectedUser.color}40`,
          padding: '8px 20px',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div className="avatar" style={{ background: selectedUser.color, width: 26, height: 26, fontSize: 10 }}>
            {selectedUser.initials}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Quadro de {selectedUser.name}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            — {filtered.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} tarefas ativas,{' '}
            {filtered.filter(t => t.status === 'Concluída').length} concluídas
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setUserFilter('todos')}
            style={{ marginLeft: 'auto', fontSize: 12 }}
          >
            ✕ Ver todos
          </button>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="loading">Carregando tarefas...</div>
      ) : (
        <div style={{
          flex: 1, overflowX: 'auto', overflowY: 'hidden',
          padding: '16px 20px',
          display: 'flex', gap: 12,
        }}>
          {columns.map(col => (
            <div key={col.key} style={{
              flexShrink: 0, width: 280,
              display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '100%',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'white',
                borderRadius: 8, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{col.key}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: col.bg || '#f3f4f6', color: col.color,
                  padding: '2px 7px', borderRadius: 20
                }}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4
              }}>
                {col.tasks.length === 0 ? (
                  <div style={{
                    padding: '24px 12px', textAlign: 'center',
                    color: 'var(--text-3)', fontSize: 12,
                    border: '2px dashed var(--border)', borderRadius: 10,
                  }}>
                    Arraste cards aqui
                  </div>
                ) : (
                  col.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showAssignee={userFilter === 'todos'}
                      onClick={t => setDetailId(t.id)}
                    />
                  ))
                )}
              </div>

              {/* Add button */}
              <button
                className="btn btn-ghost"
                onClick={() => setShowForm(true)}
                style={{ justifyContent: 'flex-start', color: 'var(--text-3)', fontSize: 12 }}
              >
                + Adicionar tarefa
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TaskForm task={null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadTasks(); }} />
      )}
      {detailId && (
        <TaskDetail taskId={detailId} onClose={() => setDetailId(null)} onUpdate={loadTasks} />
      )}
    </div>
  );
}