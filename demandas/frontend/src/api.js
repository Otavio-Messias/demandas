import axios from 'axios';

const api = axios.create({
  // Em produção (Render), usa a URL do backend
  // Em desenvolvimento local, usa o proxy do vite (/api → localhost:3001)
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

export default api;
