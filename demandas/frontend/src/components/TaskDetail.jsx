import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStatus, getPriorityClass, formatDate, isOverdue, STATUSES, PRIORITIES } from '../utils';
import api from '../api';

export default function TaskDetail({ taskId, onClose, onUpdate }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectStatus, setRejectStatus] = useState('Em andamento');
  const [editing, setEditing] = useState(false);
  const commentsRef = useRef(null);

  const load = () => {
    api.get(`/tasks/${taskId}`).then(r => {
      setTask(r.data);
      setLoading(false);
    }).catch(() => onClose());
  };

  useEffect(() => { load(); }, [taskId]);

  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [task?.comments]);

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { content: comment });
      setComment('');
      load();
      onUpdate();
    } finally { setSubmitting(false); }
  };

  const handleApprove = async () => {
    await api.post(`/tasks/${taskId}/approve`);
    load(); onUpdate();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await api.post(`/tasks/${taskId}/reject`, { reason: rejectReason, return_status: rejectStatus });
    setRejectModal(false);
    load(); onUpdate();
  };

  const handleStatusChange = async (newStatus) => {
    await api.put(`/tasks/${taskId}`, { status: newStatus });
    load(); onUpdate();
  };

  const toggleChecklistItem = async (itemId, currentDone) => {
    try {
      await api.patch(`/tasks/${taskId}/checklist/${itemId}`, { done: !currentDone });
      load(); onUpdate();
    } catch (e) {
      // Sem permissão ou erro - silenciosamente recarrega para refletir estado real
      load();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Excluir esta tarefa permanentemente?')) return;
    await api.delete(`/tasks/${taskId}`);
    onClose(); onUpdate();
  };

  if (loading) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal"><div className="loading">Carregando...</div></div>
    </div>
  );

  const st = getStatus(task.status);
  const overdue = isOverdue(task.deadline, task.status);
  const canEdit = isAdmin || task.assignee_id === user.id;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '20px 24px 0', gap: 12
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                background: st.bg, color: st.color
              }}>{task.status}</span>
              <span className={getPriorityClass(task.priority)}>{task.priority}</span>
              {overdue && (
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>⚠ Atrasada</span>
              )}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{task.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {canEdit && (
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(true)} title="Editar">✏</button>
            )}
            {isAdmin && (
              <button className="btn btn-ghost btn-sm btn-icon" onClick={handleDelete} title="Excluir"
                style={{ color: '#dc2626' }}>🗑</button>
            )}
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Meta info */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
            padding: 14, background: 'var(--surface-2)', borderRadius: 8
          }}>
            <MetaItem label="Solicitante" value={task.requester} />
            <MetaItem label="Responsável">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="avatar" style={{ background: task.assignee_color, width: 22, height: 22, fontSize: 9 }}>
                  {task.assignee_initials}
                </div>
                <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
              </div>
            </MetaItem>
            {task.deadline && (
              <MetaItem label="Prazo">
                <span style={{ color: overdue ? '#dc2626' : 'inherit', fontWeight: overdue ? 600 : 400, fontSize: 13 }}>
                  {formatDate(task.deadline)}
                </span>
              </MetaItem>
            )}
            <MetaItem label="Criado por" value={task.creator_name} />
          </div>

          {/* Admin approval actions */}
          {isAdmin && task.status === 'Aguardando aceite' && (
            <div style={{
              padding: 14, background: '#faf5ff', border: '1px solid #e9d5ff',
              borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
                ⏳ Esta tarefa aguarda sua aprovação para ser concluída
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={handleApprove}
                  style={{ background: '#10b981', color: 'white' }}>
                  ✓ Aprovar conclusão
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => setRejectModal(true)}>
                  ✗ Recusar e devolver
                </button>
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {task.rejection_reason && (
            <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>MOTIVO DA RECUSA</div>
              <div style={{ fontSize: 13 }}>{task.rejection_reason}</div>
            </div>
          )}

          {/* Status change (non-admin) */}
          {!isAdmin && canEdit && task.status !== 'Concluída' && task.status !== 'Cancelada' && (
            <div className="form-group">
              <label className="form-label">Mover para</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Pendente', 'Em andamento', 'Aguardando retorno', 'Aguardando aceite'].map(s => (
                  <button
                    key={s}
                    className="btn btn-sm btn-secondary"
                    disabled={task.status === s}
                    onClick={() => handleStatusChange(s)}
                    style={{
                      background: task.status === s ? getStatus(s).bg : '',
                      color: task.status === s ? getStatus(s).color : '',
                      borderColor: task.status === s ? getStatus(s).color : '',
                      fontWeight: task.status === s ? 600 : 400,
                    }}
                  >
                    {s === 'Aguardando aceite' ? '✓ Marcar concluída' : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin status change */}
          {isAdmin && task.status !== 'Concluída' && (
            <div className="form-group">
              <label className="form-label">Alterar status</label>
              <select
                className="form-select"
                value={task.status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                {STATUSES.map(s => <option key={s.key}>{s.key}</option>)}
              </select>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Descrição</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </div>
          )}

          {task.what_to_do && (
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>O que precisa ser feito</div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.what_to_do}</p>
            </div>
          )}

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div>
              {(() => {
                const doneCount = task.checklist.filter(i => i.done).length;
                const total = task.checklist.length;
                return (
                  <>
                    <div className="form-label" style={{ marginBottom: 6 }}>
                      Checklist ({doneCount}/{total})
                    </div>
                    <div style={{
                      height: 5, background: '#f0f1f3', borderRadius: 10,
                      overflow: 'hidden', marginBottom: 10
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
                        background: '#10b981',
                        transition: 'width 0.2s'
                      }} />
                    </div>
                  </>
                );
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.checklist.map(item => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', background: 'var(--surface-2)',
                      borderRadius: 8,
                      cursor: canEdit ? 'pointer' : 'default',
                      opacity: canEdit ? 1 : 0.85
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={!canEdit}
                      onChange={() => toggleChecklistItem(item.id, item.done)}
                      style={{ width: 16, height: 16, cursor: canEdit ? 'pointer' : 'default', flexShrink: 0 }}
                    />
                    <span style={{
                      flex: 1, fontSize: 13,
                      textDecoration: item.done ? 'line-through' : 'none',
                      color: item.done ? 'var(--text-3)' : 'var(--text)'
                    }}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
              {!canEdit && (
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                  Somente o responsável pela tarefa pode marcar os itens.
                </p>
              )}
            </div>
          )}

          {/* Comments / History */}
          <div>
            <div className="form-label" style={{ marginBottom: 10 }}>Comentários e histórico</div>
            <div
              ref={commentsRef}
              style={{
                maxHeight: 220, overflowY: 'auto', display: 'flex',
                flexDirection: 'column', gap: 8, marginBottom: 10
              }}
            >
              {task.comments?.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Nenhum comentário ainda.</p>
              )}
              {task.comments?.map(c => (
                <div key={c.id} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: c.type === 'history' ? '6px 10px' : '8px 10px',
                  background: c.type === 'history' ? '#f8f9fb' : 'white',
                  border: '1px solid var(--border-light)', borderRadius: 8
                }}>
                  {c.type !== 'history' && (
                    <div className="avatar" style={{ background: c.user_color, width: 26, height: 26, fontSize: 9, flexShrink: 0 }}>
                      {c.user_initials}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    {c.type !== 'history' && (
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{c.user_name} </span>
                    )}
                    {c.type === 'history' && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>🕐 </span>
                    )}
                    <span style={{ fontSize: 12, color: c.type === 'history' ? 'var(--text-3)' : 'var(--text-2)' }}>
                      {c.content}
                    </span>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div className="avatar" style={{ background: user.color, width: 28, height: 28, fontSize: 10, flexShrink: 0, marginTop: 1 }}>
                {user.initials}
              </div>
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input
                  className="form-input"
                  placeholder="Adicionar comentário..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
                />
                <button className="btn btn-primary btn-sm" onClick={sendComment} disabled={submitting || !comment.trim()}>
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && setRejectModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Recusar conclusão</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Motivo da recusa *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Explique o que precisa ser corrigido..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Devolver para</label>
                <select className="form-select" value={rejectStatus} onChange={e => setRejectStatus(e.target.value)}>
                  <option>Em andamento</option>
                  <option>Pendente</option>
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(false)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleReject} disabled={!rejectReason.trim()}>
                  Confirmar recusa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-3)', marginBottom: 3 }}>
        {label}
      </div>
      {children || <div style={{ fontSize: 13, color: 'var(--text)' }}>{value || '—'}</div>}
    </div>
  );
}
