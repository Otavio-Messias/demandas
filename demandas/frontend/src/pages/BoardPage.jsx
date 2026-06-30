import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Guarda o ID sendo arrastado de forma confiável
  const dragRef = useRef(null);

  const loadTasks = useCallback(() => {
    api.get('/tasks').then(r => {
      setTasks(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTasks();
    if (isAdmin) api.get('/users/all').then(r => setUsers(r.data)).catch(() => {});
  }, [loadTasks, isAdmin]);

  const taskCountByUser = users.reduce((acc, u) => {
    acc[u.id] = tasks.filter(t =>
      t.assignee_id === u.id && t.status !== 'Concluída' && t.status !== 'Cancelada'
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

  // Drag start — guarda o id no ref E no dataTransfer
  const onDragStart = (e, taskId) => {
    dragRef.current = taskId;
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setDraggingId(taskId), 0);
  };

  const onDragEnd = () => {
    dragRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    setDragOverCol(null);
  };

  // Quando passa por cima de um card
  const onDragOverCard = (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(taskId);
    setDragOverCol(null);
  };

  // Quando passa por cima da coluna (área vazia)
  const onDragOverCol = (e, colKey) => {
    e.preventDefault();
    setDragOverCol(colKey);
    setDragOverId(null);
  };

  // Drop em cima de um card
  const onDropCard = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();

    // Pega o ID do dataTransfer (mais confiável que ref em alguns browsers)
    let fromId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!fromId) fromId = dragRef.current;
    if (!fromId || fromId === targetId) { onDragEnd(); return; }

    const fromTask = tasks.find(t => t.id === fromId);
    const toTask = tasks.find(t => t.id === targetId);
    if (!fromTask || !toTask) { onDragEnd(); return; }

    if (fromTask.status === toTask.status) {
      // Mesma coluna — reordenar
      const colTasks = [...tasks]
        .filter(t => t.status === fromTask.status)
        .sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));

      const fi = colTasks.findIndex(t => t.id === fromId);
      const ti = colTasks.findIndex(t => t.id === targetId);
      if (fi < 0 || ti < 0) { onDragEnd(); return; }

      const reordered = [...colTasks];
      reordered.splice(fi, 1);
      reordered.splice(ti, 0, fromTask);

      // Atualiza localmente
      setTasks(prev => {
        const next = [...prev];
        reordered.forEach((t, idx) => {
          const i = next.findIndex(n => n.id === t.id);
          if (i >= 0) next[i] = { ...next[i], position: idx + 1 };
        });
        return next;
      });

      // Salva no backend
      api.post('/tasks/reorder', { orderedIds: reordered.map(t => t.id) })
        .catch(() => loadTasks());

    } else {
      // Coluna diferente — muda status
      const canMove = isAdmin || fromTask.assignee_id === user.id;
      if (!canMove) { onDragEnd(); return; }

      let newStatus = toTask.status;
      if (!isAdmin) {
        if (newStatus === 'Concluída') newStatus = 'Aguardando aceite';
        if (newStatus === 'Cancelada') { onDragEnd(); return; }
      }

      setTasks(prev => prev.map(t => t.id === fromId ? { ...t, status: newStatus } : t));
      api.put(`/tasks/${fromId}`, { status: newStatus }).catch(() => loadTasks());
    }

    onDragEnd();
  };

  // Drop na coluna vazia
  const onDropCol = (e, colKey) => {
    e.preventDefault();

    let fromId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!fromId) fromId = dragRef.current;
    if (!fromId) { onDragEnd(); return; }

    const fromTask = tasks.find(t => t.id === fromId);
    if (!fromTask || fromTask.status === colKey) { onDragEnd(); return; }

    const canMove = isAdmin || fromTask.assignee_id === user.id;
    if (!canMove) { onDragEnd(); return; }

    let newStatus = colKey;
    if (!isAdmin) {
      if (newStatus === 'Concluída') newStatus = 'Aguardando aceite';
      if (newStatus === 'Cancelada') { onDragEnd(); return; }
    }

    setTasks(prev => prev.map(t => t.id === fromId ? { ...t, status: newStatus } : t));
    api.put(`/tasks/${fromId}`, { status: newStatus }).catch(() => loadTasks());

    onDragEnd();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', maxWidth: '100vw' }}>
      <Navbar tasks={tasks} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 20px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14 }}>🔍</span>
          <input className="form-input" placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option>Todas as prioridades</option>
          <option>Alta</option><option>Média</option><option>Baixa</option><option>Urgente</option>
        </select>
        {isAdmin && users.length > 0 && (
          <select className="form-select" value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="todos">Todos os usuários ({tasks.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} ativas)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({taskCountByUser[u.id] || 0} ativas)</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        {isAdmin && pendingApproval > 0 && (
          <span style={{ fontSize: 12, background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
            ⏳ {pendingApproval} aguardando aceite
          </span>
        )}
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ flexShrink: 0 }}>+ Nova tarefa</button>
      </div>

      {/* User filter banner */}
      {isAdmin && selectedUser && (
        <div style={{ background: selectedUser.color + '18', borderBottom: `2px solid ${selectedUser.color}40`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ background: selectedUser.color, width: 26, height: 26, fontSize: 10 }}>{selectedUser.initials}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Quadro de {selectedUser.name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            — {filtered.filter(t => t.status !== 'Concluída' && t.status !== 'Cancelada').length} ativas,{' '}
            {filtered.filter(t => t.status === 'Concluída').length} concluídas
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setUserFilter('todos')} style={{ marginLeft: 'auto', fontSize: 12 }}>✕ Ver todos</button>
        </div>
      )}

      {/* Board */}
      {loading ? <div className="loading">Carregando tarefas...</div> : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 12, minWidth: 0, width: '100%' }}>
          {columns.map(col => (
            <div key={col.key} style={{ flexShrink: 0, width: 280, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '100%' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{col.key}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.bg || '#f3f4f6', color: col.color, padding: '2px 7px', borderRadius: 20 }}>
                  {col.tasks.length}
                </span>
              </div>

              {/* Drop zone — cobre toda a coluna */}
              <div
                onDragOver={e => onDragOverCol(e, col.key)}
                onDrop={e => onDropCol(e, col.key)}
                style={{
                  flex: 1, overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4,
                  borderRadius: 10, minHeight: 80,
                  border: dragOverCol === col.key ? `2px dashed ${col.color}` : '2px solid transparent',
                  background: dragOverCol === col.key ? col.color + '0a' : 'transparent',
                  padding: dragOverCol === col.key ? '6px' : '0 0 4px 0',
                  transition: 'all 0.1s',
                }}
              >
                {col.tasks.length === 0 ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 80, borderRadius: 10, fontSize: 12,
                    color: dragOverCol === col.key ? col.color : 'var(--text-3)',
                    border: `2px dashed ${dragOverCol === col.key ? col.color : 'var(--border)'}`,
                    fontWeight: dragOverCol === col.key ? 600 : 400,
                  }}>
                    {dragOverCol === col.key ? '⬇ Soltar aqui' : 'Arraste cards aqui'}
                  </div>
                ) : (
                  col.tasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => onDragOverCard(e, task.id)}
                      onDrop={e => onDropCard(e, task.id)}
                      style={{
                        opacity: draggingId === task.id ? 0.3 : 1,
                        outline: dragOverId === task.id && draggingId !== task.id ? `2px solid ${col.color}` : 'none',
                        outlineOffset: 2,
                        borderRadius: 10,
                        cursor: 'grab',
                        transform: dragOverId === task.id && draggingId !== task.id ? 'translateY(-3px)' : 'none',
                        transition: 'opacity 0.1s, transform 0.1s',
                      }}
                    >
                      <TaskCard
                        task={task}
                        showAssignee={userFilter === 'todos'}
                        onClick={t => { if (!draggingId) setDetailId(t.id); }}
                      />
                    </div>
                  ))
                )}
              </div>

              <button className="btn btn-ghost" onClick={() => setShowForm(true)}
                style={{ justifyContent: 'flex-start', color: 'var(--text-3)', fontSize: 12 }}>
                + Adicionar tarefa
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && <TaskForm task={null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); loadTasks(); }} />}
      {detailId && <TaskDetail taskId={detailId} onClose={() => setDetailId(null)} onUpdate={loadTasks} />}
    </div>
  );
}