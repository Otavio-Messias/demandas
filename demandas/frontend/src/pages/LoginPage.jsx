import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f2f5 0%, #e8eaf0 100%)', padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, background: '#111827',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 20
          }}>📋</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Demandas</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ marginTop: 4, padding: '11px', justifyContent: 'center' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{
          marginTop: 24, padding: '14px', background: '#f8f9fb',
          borderRadius: 8, fontSize: 12, color: 'var(--text-3)'
        }}>
          <strong style={{ color: 'var(--text-2)' }}>Acesso demo:</strong><br />
          Admin: admin@empresa.com / admin123<br />
          Usuário: selma@empresa.com / senha123
        </div>
      </div>
    </div>
  );
}
