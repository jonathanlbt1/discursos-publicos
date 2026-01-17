import React, { useState } from 'react';
import { login, changePassword } from '../services/api';
import '../styles/Auth.css';

function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forçar reset de senha no primeiro login
  const [forceResetOpen, setForceResetOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData);
      const { token, usuario } = response.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      // If this is first login (ultimo_acesso null/undefined), force password reset flow
      if (!usuario.ultimo_acesso) {
        setForceResetOpen(true);
        // Keep usuario in localStorage and wait for password reset before calling onLoginSuccess
      } else {
        onLoginSuccess(usuario);
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const submitForceReset = async () => {
    setError('');
    if (!novaSenha || novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (novaSenha !== confirmSenha) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      // senhaAtual is the provisional password the user used to login (stored in formData.senha)
      await changePassword({ senhaAtual: formData.senha, novaSenha });
      // After successful change, refresh stored usuario and call parent
      const usuario = JSON.parse(localStorage.getItem('usuario'));
      onLoginSuccess(usuario);
      setForceResetOpen(false);
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
      setError(err.response?.data?.error || 'Erro ao resetar senha.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>🙏 Sistema de Discursos</h1>
          <p>Faça login para continuar</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>E-mail</label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              className="form-control"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              required
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Removed public registration messaging per request */}

        <div className="auth-footer">
          <p>
            {/* Intentionally left blank to avoid registration prompts */}
          </p>
        </div>
      </div>

      {/* Force-reset modal shown on first login when ultimo_acesso was null */}
      {forceResetOpen && (
        <div className="modal-overlay" onClick={() => setForceResetOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Trocar senha provisória</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setForceResetOpen(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p>Esta é a primeira vez que você entra. Por segurança, defina uma nova senha.</p>
            </div>

            <div className="form-group">
              <label>Nova senha</label>
              <input type="password" className="form-control" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label>Confirmar nova senha</label>
              <input type="password" className="form-control" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForceResetOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitForceReset}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;

