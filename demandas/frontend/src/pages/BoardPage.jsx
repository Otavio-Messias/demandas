import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import TaskDetail from '../components/TaskDetail';
import { STATUSES, getStatus } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

export default function BoardPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Todas as prioridades');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const loadTasks = useCallback(() => {
    api.get('/tasks').then(r => {
      setTasks(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.requester.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchPriority = priorityFilter === 'Todas as prioridades' || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const columns = STATUSES.map(s => ({
    ...s,
    tasks: filtered.filter(t => t.status === s.key)
  }));

  const pendingApproval = tasks.filter(t => t.status === 'Aguardando aceite').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar tasks={tasks} />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px',
        background: 'white', borderBottom: '1px solid var(--border)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
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

        <div style={{ flex: 1 }} />

        {isAdmin && pendingApproval > 0 && (
          <span style={{
            fontSize: 12, background: '#f5f3ff', color: '#7c3aed',
            padding: '4px 10px', borderRadius: 20, fontWeight: 600
          }}>
            ⏳ {pendingApproval} aguardando aceite
          </span>
        )}

        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Nova tarefa
        </button>
      </div>

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
              flexShrink: 0,
              width: 280,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: '100%',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'white',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: col.color
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{col.key}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: col.bg || '#f3f4f6',
                  color: col.color,
                  padding: '2px 7px', borderRadius: 20
                }}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{
                flex: 1, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 8,
                paddingBottom: 4
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

      {/* Modals */}
      {showForm && (
        <TaskForm
          task={null}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); loadTasks(); }}
        />
      )}

      {editTask && (
        <TaskForm
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={() => { setEditTask(null); loadTasks(); }}
        />
      )}

      {detailId && (
        <TaskDetail
          taskId={detailId}
          onClose={() => setDetailId(null)}
          onUpdate={loadTasks}
        />
      )}
    </div>
  );
}
