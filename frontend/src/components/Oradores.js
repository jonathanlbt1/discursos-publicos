/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { getOradores, createOrador, updateOrador, deleteOrador, getHistoricoOrador, getCongregacoes } from '../services/api';
import { format } from 'date-fns';
import SearchBar from './SearchBar';

function Oradores({ usuarioLogado }) {
  const [oradores, setOradores] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [filtroCongregacao, setFiltroCongregacao] = useState('');
  const buscaDebounceRef = useRef(null);
  const isInitialLoad = useRef(true);

  const [formData, setFormData] = useState({
    nome: '',
    celular: '',
    email: '',
    ativo: true,
    congregacao_id: ''
  });

  const [congregacoes, setCongregacoes] = useState([]);

  const PAGE_LIMIT = 25;

  // load initial data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregarOradores(true);
    // carregarCongregacoes fetches paginated response; set only items
    carregarCongregacoes();
  }, []);

  const carregarCongregacoes = async () => {
    try {
      const resp = await getCongregacoes();
      // api returns { items, total }
      setCongregacoes((resp.data && resp.data.items) || []);
    } catch (error) {
      console.error('Erro ao carregar congregações:', error);
    }
  };

  // When filters change, reload from server with debounce for busca
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Limpar o timeout anterior se existir (apenas para busca)
    if (buscaDebounceRef.current) {
      clearTimeout(buscaDebounceRef.current);
    }

    // Se busca estiver vazia ou for mudança de filtro (não busca), buscar imediatamente
    if (busca === '') {
      carregarOradores(true);
      setOffset(0);
      return;
    }

    // Para busca, criar timeout para buscar após 200ms sem digitação
    buscaDebounceRef.current = setTimeout(() => {
      carregarOradores(true);
      setOffset(0);
    }, 200);

    // Cleanup: limpar timeout se componente desmontar ou busca mudar novamente
    return () => {
      if (buscaDebounceRef.current) {
        clearTimeout(buscaDebounceRef.current);
      }
    };
  }, [busca]);

  // Quando filtros (não busca) mudam, buscar imediatamente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Só executar se não for o carregamento inicial
    if (!isInitialLoad.current) {
      carregarOradores(true);
      setOffset(0);
    }
  }, [filtroAtivo, filtroCongregacao]);

  const carregarOradores = async (reset = false) => {
    try {
      // Só mostrar loading completo no carregamento inicial
      if (reset && isInitialLoad.current) {
        setLoading(true);
        setOradores([]);
        setOffset(0);
      } else if (reset) {
        // Para buscas/filtros, não mostrar loading que bloqueia a tela
        setOradores([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const ativoParam = filtroAtivo === 'ativos' ? true : filtroAtivo === 'inativos' ? false : undefined;
      const params = {
        busca: busca || undefined,
        ativo: ativoParam,
        congregacao_id: filtroCongregacao || undefined,
        limit: PAGE_LIMIT,
        offset: reset ? 0 : offset + PAGE_LIMIT
      };

      const response = await getOradores(params);
      const data = response.data || { items: [], total: 0 };
      if (reset) {
        setOradores(data.items);
        setTotal(data.total || 0);
        setOffset(0);
      } else {
        setOradores(prev => [...prev, ...(data.items || [])]);
        setOffset(prev => prev + PAGE_LIMIT);
      }
    } catch (error) {
      console.error('Erro ao carregar oradores:', error);
    } finally {
      if (isInitialLoad.current) {
        setLoading(false);
        // Marcar como carregamento inicial concluído apenas após o loading terminar
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 0);
      }
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, congregacao_id: formData.congregacao_id || null };
      if (editando) {
        await updateOrador(editando, payload);
      } else {
        await createOrador(payload);
      }
      setShowModal(false);
      resetForm();
      // Recarrega a lista resetando para o início, respeitando os filtros atuais
      carregarOradores(true);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar orador');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este orador?')) {
      try {
        await deleteOrador(id);
        // Recarrega a lista resetando para o início, respeitando os filtros atuais
        carregarOradores(true);
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir orador');
      }
    }
  };

  const handleEdit = (orador) => {
    setEditando(orador.id);
    setFormData({
      nome: orador.nome,
      celular: orador.celular || '',
      email: orador.email || '',
      ativo: orador.ativo,
      congregacao_id: orador.congregacao_id || ''
    });
    setShowModal(true);
  };

  const handleVerHistorico = async (orador) => {
    try {
      const response = await getHistoricoOrador(orador.id);
      setHistoricoSelecionado(response.data);
      setShowHistorico(true);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      alert('Erro ao carregar histórico');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      celular: '',
      email: '',
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
            <h2>Oradores</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Novo Orador
              </button>
            )}
          </div>

        <SearchBar
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por nome, email ou celular..."
        />

        <div className="filters-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="filter-group" style={{ maxWidth: '200px', flex: '0 0 auto' }}>
            <label>Filtrar por status:</label>
            <select 
              value={filtroAtivo} 
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="form-control"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Somente Ativos</option>
              <option value="inativos">Somente Inativos</option>
            </select>
          </div>
          <div className="filter-group" style={{ maxWidth: '250px', flex: '0 0 auto' }}>
            <label>Filtrar por congregação:</label>
            <select
              value={filtroCongregacao}
              onChange={(e) => setFiltroCongregacao(e.target.value)}
              className="form-control"
            >
              <option value="">Todas</option>
              {congregacoes.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {oradores.length > 0 && (
          <div className="results-count">
            Mostrando <strong>{oradores.length}</strong> de <strong>{total}</strong> oradores
          </div>
        )}

        {oradores.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum orador cadastrado</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Congregação</th>
                  <th>Celular</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {oradores.map((orador) => (
                  <tr key={orador.id}>
                    <td><strong>{orador.nome}</strong></td>
                    <td>{orador.congregacao_nome || 'N/A'}</td>
                    <td>{orador.celular || 'N/A'}</td>
                    <td>{orador.email || 'N/A'}</td>
                    <td>
                      <span className={`badge ${orador.ativo ? 'badge-recebido' : 'badge-local'}`}>
                        {orador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleVerHistorico(orador)}>
                          Histórico
                        </button>
                        {usuarioLogado?.role === 'admin' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(orador)}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(orador.id)}>
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {oradores.length < total && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-light" onClick={() => carregarOradores(false)} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais →'}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Orador' : 'Novo Orador'}</h3>
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
                <label>Celular</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Congregação</label>
                <select
                  className="form-control"
                  value={formData.congregacao_id}
                  onChange={(e) => setFormData({ ...formData, congregacao_id: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  {congregacoes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
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

      {showHistorico && (
        <div className="modal-overlay" onClick={() => setShowHistorico(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Histórico de Discursos Enviados</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowHistorico(false)}>
                ✕
              </button>
            </div>

            {historicoSelecionado.length === 0 ? (
              <div className="empty-state">
                <p>Este orador ainda não foi enviado para outras congregações</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Discurso</th>
                      <th>Congregação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoSelecionado.map((item) => (
                      <tr key={item.id}>
                        <td>{format(new Date(item.data), 'dd/MM/yyyy')}</td>
                        <td><strong>#{item.numero}</strong> - {item.tema}</td>
                        <td>{item.congregacao_nome || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Oradores;

