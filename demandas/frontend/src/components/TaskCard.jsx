import React from 'react';
import { getStatus, getPriorityClass, formatDate, isOverdue } from '../utils';

export default function TaskCard({ task, onClick, showAssignee = true }) {
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px', cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.1s', position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Priority indicator line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: task.priority === 'Alta' || task.priority === 'Urgente' ? '#ef4444' :
                    task.priority === 'Média' ? '#f59e0b' : '#10b981',
        borderRadius: '10px 10px 0 0', opacity: 0.7
      }} />

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</h3>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: getStatus(task.status).color
        }} />
      </div>

      {/* Assignee name - highlighted */}
      {showAssignee && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6
        }}>
          <div
            className="avatar"
            style={{ background: task.assignee_color || '#6366f1', width: 18, height: 18, fontSize: 8 }}
          >
            {task.assignee_initials}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: task.assignee_color || 'var(--text-2)' }}>
            {task.assignee_name}
          </span>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span className={getPriorityClass(task.priority)}>{task.priority}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {task.checklist && task.checklist.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              ☑ {task.checklist.filter(i => i.done).length}/{task.checklist.length}
            </span>
          )}
          {task.comment_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              💬 {task.comment_count}
            </span>
          )}
          {task.deadline && (
            <span style={{
              fontSize: 11,
              color: overdue ? '#dc2626' : 'var(--text-3)',
              fontWeight: overdue ? 600 : 400,
            }}>
              {overdue ? '⚠ ' : ''}{formatDate(task.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
