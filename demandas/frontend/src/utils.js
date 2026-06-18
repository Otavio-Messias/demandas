export const STATUSES = [
  { key: 'Pendente', color: '#9ca3af', bg: '#f3f4f6', light: '#f9fafb' },
  { key: 'Em andamento', color: '#3b82f6', bg: '#eff6ff', light: '#f0f9ff' },
  { key: 'Aguardando retorno', color: '#f59e0b', bg: '#fffbeb', light: '#fefce8' },
  { key: 'Aguardando aceite', color: '#8b5cf6', bg: '#f5f3ff', light: '#faf5ff' },
  { key: 'Concluída', color: '#10b981', bg: '#ecfdf5', light: '#f0fdf4' },
  { key: 'Cancelada', color: '#ef4444', bg: '#fef2f2', light: '#fff5f5' },
];

export function getStatus(key) {
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}

export const PRIORITIES = ['Alta', 'Média', 'Baixa', 'Urgente'];

export function getPriorityClass(p) {
  const map = { Alta: 'alta', Média: 'media', Baixa: 'baixa', Urgente: 'urgente' };
  return `badge badge-${map[p] || 'media'}`;
}

export function formatDate(d) {
  if (!d) return null;
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

export function isOverdue(deadline, status) {
  if (!deadline || status === 'Concluída' || status === 'Cancelada') return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}
