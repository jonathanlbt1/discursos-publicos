/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, resetPassword } from '../services/api';
import { format } from 'date-fns';

function Usuarios({ usuarioLogado }) {
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [usuarioReset, setUsuarioReset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'usuario',
    ativo: true
  });

  const PAGE_LIMIT = 25;

  // load initial users
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregarUsuarios(true);
  }, []);

  const carregarUsuarios = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setUsuarios([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      // Agora o backend retorna apenas o próprio usuário se não for admin
      const response = await getUsuarios({ limit: PAGE_LIMIT, offset: reset ? 0 : offset + PAGE_LIMIT });
      const data = response.data || { items: [], total: 0 };
      if (reset) {
        setUsuarios(data.items);
        setTotal(data.total || 0);
        setOffset(0);
      } else {
        setUsuarios(prev => [...prev, ...(data.items || [])]);
        setOffset(prev => prev + PAGE_LIMIT);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await updateUsuario(editando, formData);
      } else {
        // If admin didn't provide a password, generate a provisional one
        let provisional = formData.senha;
        if (!provisional) {
          provisional = generateProvisionalPassword();
          formData.senha = provisional;
        }
  await createUsuario(formData);
        // Inform admin of the provisional password so they can pass it to the user
        if (provisional) {
          // eslint-disable-next-line no-alert
          alert(`Usuário criado. Senha provisória: ${provisional}\nCompartilhe essa senha com o usuário e oriente-o a trocá-la no primeiro login.`);
        }
      }
      setShowModal(false);
      resetForm();
      // Recarrega a lista resetando para o início
      carregarUsuarios(true);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  function generateProvisionalPassword() {
    // Generate a reasonably strong provisional password: 12 chars with upper/lower/numbers
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const all = upper + lower + numbers;
    let pass = '';
    pass += upper[Math.floor(Math.random() * upper.length)];
    pass += lower[Math.floor(Math.random() * lower.length)];
    pass += numbers[Math.floor(Math.random() * numbers.length)];
    for (let i = 0; i < 9; i++) {
      pass += all[Math.floor(Math.random() * all.length)];
    }
    return pass;
  }

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este usuário?')) {
      try {
        await deleteUsuario(id);
        // Recarrega a lista resetando para o início
        carregarUsuarios(true);
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert(error.response?.data?.error || 'Erro ao excluir usuário');
      }
    }
  };

  const handleEdit = (usuario) => {
    setEditando(usuario.id);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      ativo: usuario.ativo,
      senha: '' // Não exibir senha ao editar
    });
    setShowModal(true);
  };

  const handleResetPassword = (usuario) => {
    setUsuarioReset(usuario);
    setNovaSenha('');
    setShowResetModal(true);
  };

  const confirmResetPassword = async () => {
    if (!novaSenha || novaSenha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      await resetPassword(usuarioReset.id, { novaSenha });
      alert('Senha resetada com sucesso!');
      setShowResetModal(false);
      setUsuarioReset(null);
      setNovaSenha('');
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      alert(error.response?.data?.error || 'Erro ao resetar senha');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      role: 'usuario',
      ativo: true
    });
    setEditando(null);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Gerenciamento de Usuários</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Novo Usuário
              </button>
            )}
          </div>

        {usuarios.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Função</th>
                  <th>Status</th>
                  <th>Último Acesso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <strong>{usuario.nome}</strong>
                      {usuario.id === usuarioLogado.id && (
                        <span className="badge badge-local" style={{ marginLeft: '0.5rem' }}>Você</span>
                      )}
                    </td>
                    <td>{usuario.email}</td>
                    <td>
                      <span className={`badge ${usuario.role === 'admin' ? 'badge-enviado' : 'badge-local'}`}>
                        {usuario.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${usuario.ativo ? 'badge-recebido' : 'badge-local'}`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      {usuario.ultimo_acesso
                        ? format(new Date(usuario.ultimo_acesso), 'dd/MM/yyyy HH:mm')
                        : 'Nunca'}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-warning btn-sm" onClick={() => handleResetPassword(usuario)}>
                          Resetar Senha
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(usuario)}>
                          Editar
                        </button>
                        {usuarioLogado?.role === 'admin' && usuario.id !== usuarioLogado.id && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(usuario.id)}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {usuarioLogado?.role === 'admin' && usuarios.length < total && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-light" onClick={() => carregarUsuarios(false)} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais →'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>E-mail *</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {!editando && (
                <div className="form-group">
                  <label>Senha *</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required={!editando}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              {usuarioLogado?.role === 'admin' && (
                <>
                  <div className="form-group">
                    <label>Função *</label>
                    <select
                      className="form-control"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                    >
                      <option value="usuario">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Ativo
                    </label>
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editando ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reset de Senha */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Resetar Senha</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResetModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p>Resetar senha de: <strong>{usuarioReset?.nome}</strong></p>
            </div>

            <div className="form-group">
              <label>Nova Senha</label>
              <input
                type="password"
                className="form-control"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-warning" onClick={confirmResetPassword}>
                Resetar Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Usuarios;

