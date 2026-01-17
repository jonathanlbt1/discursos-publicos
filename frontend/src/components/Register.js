import React, { useState } from 'react';
import { register } from '../services/api';
import '../styles/Auth.css';

function Register({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allowPublic = (process.env.REACT_APP_ALLOW_PUBLIC_REGISTRATION || 'false').toLowerCase() === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allowPublic) {
      setError('Registro público está desabilitado. Contate o administrador.');
      return;
    }

    // Validações
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha
      });

      const { token, usuario } = response.data;

      // Salvar no localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      // Chamar callback de sucesso
      onRegisterSuccess(usuario);
    } catch (err) {
      console.error('Erro no registro:', err);
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>🙏 Sistema de Discursos</h1>
          <p>Criar nova conta</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {allowPublic ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Nome Completo</label>
              <input
                type="text"
                className="form-control"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                placeholder="Seu nome completo"
                autoComplete="name"
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirmar Senha</label>
              <input
                type="password"
                className="form-control"
                value={formData.confirmarSenha}
                onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                required
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        ) : (
          <div className="auth-form">
            <p>Registro público está desabilitado. Entre em contato com o administrador para criar uma conta.</p>
          </div>
        )}

        <div className="auth-footer">
          <p>
            Já tem uma conta?{' '}
            <button className="link-button" onClick={() => window.location.href = '/login'}>
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;

