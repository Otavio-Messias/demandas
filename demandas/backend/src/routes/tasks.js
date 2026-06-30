const express = require('express');
const { query, queryOne } = require('../db/connection');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

async function addHistory(taskId, userId, content) {
  await query(
    `INSERT INTO comments (task_id, user_id, content, type) VALUES ($1,$2,$3,'history')`,
    [taskId, userId, content]
  );
}

function calcNextDeadline(deadline, recurrence) {
  // Se não tem prazo definido, usa hoje como base
  const base = deadline ? new Date(deadline + 'T00:00:00') : new Date();
  const next = new Date(base);

  if (recurrence === 'diaria') next.setDate(next.getDate() + 1);
  else if (recurrence === 'semanal') next.setDate(next.getDate() + 7);
  else if (recurrence === 'mensal') next.setMonth(next.getMonth() + 1);
  else return deadline || null;

  return next.toISOString().slice(0, 10); // formato YYYY-MM-DD
}

const RECURRENCE_LABELS = { diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal' };

router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const sql = `
      SELECT t.*,
        u.name as assignee_name, u.initials as assignee_initials, u.color as assignee_color,
        creator.name as creator_name,
        (SELECT COUNT(*) FROM comments WHERE task_id = t.id)::int as comment_count
      FROM tasks t
      JOIN users u ON t.assignee_id = u.id
      JOIN users creator ON t.created_by = creator.id
      ${isAdmin ? '' : 'WHERE t.assignee_id = $1 OR t.created_by = $1'}
      ORDER BY t.position ASC, t.created_at ASC
    `;
    res.json(isAdmin ? await query(sql) : await query(sql, [req.user.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne(`
      SELECT t.*, u.name as assignee_name, u.initials as assignee_initials, u.color as assignee_color, creator.name as creator_name
      FROM tasks t JOIN users u ON t.assignee_id = u.id JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (req.user.role !== 'admin' && task.assignee_id !== req.user.id && task.created_by !== req.user.id)
      return res.status(403).json({ error: 'Sem permissão' });

    const comments = await query(`
      SELECT c.*, u.name as user_name, u.initials as user_initials, u.color as user_color
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.task_id = $1 ORDER BY c.created_at ASC
    `, [task.id]);

    res.json({ ...task, comments });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, requester, assignee_id, priority = 'Média', deadline, status = 'Pendente', description, what_to_do, checklist, recurrence } = req.body;
    if (!title || !requester || !assignee_id) return res.status(400).json({ error: 'Título, solicitante e responsável são obrigatórios' });

    const finalAssignee = req.user.role === 'admin' ? assignee_id : req.user.id;
    const finalStatus = (req.user.role !== 'admin' && status === 'Concluída') ? 'Aguardando aceite' : status;
    const finalRecurrence = ['diaria', 'semanal', 'mensal'].includes(recurrence) ? recurrence : null;

    // Normaliza checklist: cada item { id, text, done }
    const safeChecklist = Array.isArray(checklist)
      ? checklist.map((item, i) => ({
          id: item.id || `c${Date.now()}_${i}`,
          text: String(item.text || '').slice(0, 300),
          done: !!item.done
        }))
      : [];

    const result = await queryOne(`
      INSERT INTO tasks (title, requester, assignee_id, priority, deadline, status, description, what_to_do, created_by, checklist, recurrence)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [title, requester, finalAssignee, priority, deadline || null, finalStatus, description || '', what_to_do || '', req.user.id, JSON.stringify(safeChecklist), finalRecurrence]);

    await addHistory(result.id, req.user.id, `Tarefa criada com status "${finalStatus}".`);
    res.status(201).json(await queryOne('SELECT * FROM tasks WHERE id = $1', [result.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && task.assignee_id !== req.user.id) return res.status(403).json({ error: 'Sem permissão' });

    const { title, requester, assignee_id, priority, deadline, status, description, what_to_do, checklist, recurrence } = req.body;
    let finalStatus = status || task.status;
    let rejectionReason = task.rejection_reason;

    if (!isAdmin && status) {
      if (status === 'Concluída') finalStatus = 'Aguardando aceite';
      if (status === 'Cancelada') return res.status(403).json({ error: 'Somente o admin pode cancelar tarefas' });
    }
    if (isAdmin && status && status !== task.status) rejectionReason = req.body.rejection_reason || null;

    const finalChecklist = Array.isArray(checklist)
      ? checklist.map((item, i) => ({
          id: item.id || `c${Date.now()}_${i}`,
          text: String(item.text || '').slice(0, 300),
          done: !!item.done
        }))
      : (task.checklist || []);

    const finalRecurrence = recurrence !== undefined
      ? (['diaria', 'semanal', 'mensal'].includes(recurrence) ? recurrence : null)
      : task.recurrence;

    await query(`
      UPDATE tasks SET
        title=$1, requester=$2, assignee_id=$3, priority=$4, deadline=$5,
        status=$6, description=$7, what_to_do=$8, rejection_reason=$9, checklist=$10, recurrence=$11, updated_at=NOW()
      WHERE id=$12
    `, [
      isAdmin ? (title || task.title) : task.title,
      isAdmin ? (requester || task.requester) : task.requester,
      isAdmin ? (assignee_id || task.assignee_id) : task.assignee_id,
      priority || task.priority,
      deadline !== undefined ? (deadline || null) : task.deadline,
      finalStatus,
      description !== undefined ? description : task.description,
      what_to_do !== undefined ? what_to_do : task.what_to_do,
      rejectionReason,
      JSON.stringify(finalChecklist),
      finalRecurrence,
      task.id
    ]);

    if (status && status !== task.status) {
      let msg = `Status alterado de "${task.status}" para "${finalStatus}".`;
      if (finalStatus === 'Aguardando aceite') msg = 'Tarefa marcada como concluída. Aguardando aprovação do administrador.';
      if (isAdmin && finalStatus === 'Concluída') msg = 'Tarefa aprovada e concluída pelo administrador.';
      if (isAdmin && task.status === 'Aguardando aceite' && ['Em andamento','Pendente'].includes(finalStatus))
        msg = `Conclusão recusada. Motivo: "${rejectionReason || 'Não informado'}". Retornada para "${finalStatus}".`;
      await addHistory(task.id, req.user.id, msg);
    }

    res.json(await queryOne('SELECT * FROM tasks WHERE id = $1', [task.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/tasks/reorder — salva nova ordem após drag and drop
router.post('/reorder', authMiddleware, async (req, res) => {
  try {
    // orderedIds: array de IDs na nova ordem [ 5, 2, 8, 1, ... ]
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds deve ser um array' });

    // Atualiza position de cada tarefa em paralelo
    await Promise.all(
      orderedIds.map((id, index) =>
        query('UPDATE tasks SET position=$1, updated_at=NOW() WHERE id=$2', [index + 1, id])
      )
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// Atualiza o checklist inteiro (adicionar/remover itens) — só responsável ou admin
router.put('/:id/checklist', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && task.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Somente o responsável pela tarefa pode editar o checklist' });
    }

    const { checklist } = req.body;
    if (!Array.isArray(checklist)) return res.status(400).json({ error: 'Checklist inválido' });

    const safeChecklist = checklist.map((item, i) => ({
      id: item.id || `c${Date.now()}_${i}`,
      text: String(item.text || '').slice(0, 300),
      done: !!item.done
    }));

    await query('UPDATE tasks SET checklist=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(safeChecklist), task.id]);
    res.json({ success: true, checklist: safeChecklist });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

// Marca/desmarca um item específico — só responsável ou admin
router.patch('/:id/checklist/:itemId', authMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && task.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'Somente o responsável pela tarefa pode marcar o checklist' });
    }

    const { done } = req.body;
    const currentChecklist = task.checklist || [];
    const updated = currentChecklist.map(item =>
      item.id === req.params.itemId ? { ...item, done: !!done } : item
    );

    await query('UPDATE tasks SET checklist=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(updated), task.id]);
    res.json({ success: true, checklist: updated });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (task.status !== 'Aguardando aceite') return res.status(400).json({ error: 'Tarefa não está aguardando aceite' });

    await query(`UPDATE tasks SET status='Concluída', rejection_reason=NULL, updated_at=NOW() WHERE id=$1`, [task.id]);
    await addHistory(task.id, req.user.id, 'Conclusão aprovada pelo administrador. Tarefa concluída.');

    let newTaskId = null;

    // Se a tarefa é recorrente, cria automaticamente a próxima ocorrência
    if (task.recurrence) {
      const nextDeadline = calcNextDeadline(task.deadline, task.recurrence);

      // Checklist da nova tarefa vem zerado (todos os itens desmarcados)
      const resetChecklist = (task.checklist || []).map(item => ({ ...item, done: false }));

      const newTask = await queryOne(`
        INSERT INTO tasks (
          title, requester, assignee_id, priority, deadline, status,
          description, what_to_do, created_by, checklist, recurrence, recurrence_parent_id
        )
        VALUES ($1,$2,$3,$4,$5,'Pendente',$6,$7,$8,$9,$10,$11)
        RETURNING id
      `, [
        task.title, task.requester, task.assignee_id, task.priority, nextDeadline,
        task.description, task.what_to_do, task.created_by,
        JSON.stringify(resetChecklist), task.recurrence,
        task.recurrence_parent_id || task.id
      ]);

      newTaskId = newTask.id;
      await addHistory(
        newTaskId, req.user.id,
        `Tarefa gerada automaticamente pela recorrência "${RECURRENCE_LABELS[task.recurrence]}" da tarefa #${task.id}.`
      );
      await addHistory(
        task.id, req.user.id,
        `Próxima ocorrência (#${newTaskId}) criada automaticamente para ${nextDeadline || 'sem prazo definido'}.`
      );
    }

    res.json({ success: true, newTaskId });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason, return_status = 'Em andamento' } = req.body;
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (task.status !== 'Aguardando aceite') return res.status(400).json({ error: 'Tarefa não está aguardando aceite' });
    await query(`UPDATE tasks SET status=$1, rejection_reason=$2, updated_at=NOW() WHERE id=$3`, [return_status, reason || 'Não informado', task.id]);
    await addHistory(task.id, req.user.id, `Conclusão recusada. Motivo: "${reason}". Retornada para "${return_status}".`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comentário não pode ser vazio' });
    const task = await queryOne('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (req.user.role !== 'admin' && task.assignee_id !== req.user.id && task.created_by !== req.user.id)
      return res.status(403).json({ error: 'Sem permissão' });

    const result = await queryOne(
      `INSERT INTO comments (task_id, user_id, content, type) VALUES ($1,$2,$3,'comment') RETURNING id`,
      [task.id, req.user.id, content]
    );
    await query(`UPDATE tasks SET updated_at=NOW() WHERE id=$1`, [task.id]);
    res.status(201).json(await queryOne(`
      SELECT c.*, u.name as user_name, u.initials as user_initials, u.color as user_color
      FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1
    `, [result.id]));
  } catch (e) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
