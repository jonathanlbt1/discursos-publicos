import React, { useState, useEffect } from 'react';
import './App.css';
import Agendamentos from './components/Agendamentos';
import Congregacoes from './components/Congregacoes';
import Discursos from './components/Discursos';
import Oradores from './components/Oradores';
import Arranjos from './components/Arranjos';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import Usuarios from './components/Usuarios';
import Calendario from './components/Calendario';
import Relatorios from './components/RelatoriosAll';
import ErrorBoundary from './components/ErrorBoundary';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usuario, setUsuario] = useState(null);
  const [showingRegister, setShowingRegister] = useState(false);

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (token && usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch (error) {
        console.error('Erro ao parsear usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }

    // Verificar rota inicial
    const path = window.location.pathname;
    if (path === '/register') {
      setShowingRegister(true);
    }
  }, []);

  const handleLoginSuccess = (usuarioLogado) => {
    setUsuario(usuarioLogado);
    setShowingRegister(false);
    window.history.pushState({}, '', '/');
  };

  const handleRegisterSuccess = (usuarioRegistrado) => {
    setUsuario(usuarioRegistrado);
    setShowingRegister(false);
    window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      setUsuario(null);
      setActiveTab('dashboard');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendario':
        return <Calendario />;
      case 'agendamentos':
        return <Agendamentos usuarioLogado={usuario} />;
      case 'relatorios':
        return <Relatorios />;
      case 'arranjos':
        return <Arranjos usuarioLogado={usuario} />;
      case 'congregacoes':
        return <Congregacoes usuarioLogado={usuario} />;
      case 'discursos':
        return <Discursos usuarioLogado={usuario} />;
      case 'oradores':
        return <Oradores usuarioLogado={usuario} />;
      case 'usuarios':
        return <Usuarios usuarioLogado={usuario} />;
      default:
        return <Dashboard />;
    }
  };

  // Se não estiver autenticado, mostrar login ou registro
  if (!usuario) {
    return (
      <ThemeProvider>
        {showingRegister ? (
          <Register onRegisterSuccess={handleRegisterSuccess} />
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Programação de Discursos</h1>
            <p>Organize e acompanhe os discursos bíblicos da congregação Jardim Santista</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <ThemeToggle />
            <div style={{ color: 'white', textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  👤 <strong>{usuario.nome}</strong>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.25rem' }}>
                    Tipo de Acesso: {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {usuario.role === 'admin' ? '🔑 Administrador' : '👥 Usuário'}
                </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none' }}>
              Sair
            </button>
          </div>
        </div>
        </header>

      <div className="container">
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-tab ${activeTab === 'calendario' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendario')}
          >
            📅 Calendário
          </button>
          <button
            className={`nav-tab ${activeTab === 'agendamentos' ? 'active' : ''}`}
            onClick={() => setActiveTab('agendamentos')}
          >
            Agendamentos
          </button>
          <button
            className={`nav-tab ${activeTab === 'relatorios' ? 'active' : ''}`}
            onClick={() => setActiveTab('relatorios')}
          >
            📊 Relatórios
          </button>
          <button
            className={`nav-tab ${activeTab === 'arranjos' ? 'active' : ''}`}
            onClick={() => setActiveTab('arranjos')}
          >
            Arranjos
          </button>
          <button
            className={`nav-tab ${activeTab === 'discursos' ? 'active' : ''}`}
            onClick={() => setActiveTab('discursos')}
          >
            Discursos
          </button>
          <button
            className={`nav-tab ${activeTab === 'oradores' ? 'active' : ''}`}
            onClick={() => setActiveTab('oradores')}
          >
            Oradores
          </button>
          <button
            className={`nav-tab ${activeTab === 'congregacoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('congregacoes')}
          >
            Congregações
          </button>
          <button
            className={`nav-tab ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('usuarios')}
          >
            Usuários
          </button>
        </nav>

        <main>
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
      </div>
    </ThemeProvider>
  );
}

export default App;

