/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { getDiscursos, createDiscurso, updateDiscurso, deleteDiscurso, getHistoricoDiscurso } from '../services/api';
import { format } from 'date-fns';
import SearchBar from './SearchBar';

function Discursos({ usuarioLogado }) {
  const [discursos, setDiscursos] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busca, setBusca] = useState('');
  const buscaDebounceRef = useRef(null);
  const isInitialLoad = useRef(true);

  const [formData, setFormData] = useState({
    numero: '',
    tema: '',
    data_versao_esboco: ''
  });

  const PAGE_LIMIT = 25;

  // load initial data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregarDiscursos(true);
  }, []);

  // When search changes, reload from server with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Limpar o timeout anterior se existir
    if (buscaDebounceRef.current) {
      clearTimeout(buscaDebounceRef.current);
    }

    // Se busca estiver vazia, buscar imediatamente
    if (busca === '') {
      carregarDiscursos(true);
      setOffset(0);
      return;
    }

    // Criar novo timeout para buscar após 200ms sem digitação
    buscaDebounceRef.current = setTimeout(() => {
      carregarDiscursos(true);
      setOffset(0);
    }, 200);

    // Cleanup: limpar timeout se componente desmontar ou busca mudar novamente
    return () => {
      if (buscaDebounceRef.current) {
        clearTimeout(buscaDebounceRef.current);
      }
    };
  }, [busca]);

  const carregarDiscursos = async (reset = false) => {
    try {
      // Só mostrar loading completo no carregamento inicial
      if (reset && isInitialLoad.current) {
        setLoading(true);
        setDiscursos([]);
        setOffset(0);
      } else if (reset) {
        // Para buscas, não mostrar loading que bloqueia a tela
        setDiscursos([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const params = {
        busca: busca || undefined,
        limit: PAGE_LIMIT,
        offset: reset ? 0 : offset + PAGE_LIMIT
      };

      const response = await getDiscursos(params);
      const data = response.data || { items: [], total: 0 };
      if (reset) {
        setDiscursos(data.items);
        setTotal(data.total || 0);
        setOffset(0);
      } else {
        setDiscursos(prev => [...prev, ...(data.items || [])]);
        setOffset(prev => prev + PAGE_LIMIT);
      }
    } catch (error) {
      console.error('Erro ao carregar discursos:', error);
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

  // server-side search replaced client-side filtering

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await updateDiscurso(editando, formData);
      } else {
        await createDiscurso(formData);
      }
      setShowModal(false);
      resetForm();
      // Recarrega a lista resetando para o início, respeitando os filtros atuais
      carregarDiscursos(true);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar discurso. Verifique se o número já não existe.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este discurso?')) {
      try {
        await deleteDiscurso(id);
        // Recarrega a lista resetando para o início, respeitando os filtros atuais
        carregarDiscursos(true);
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir discurso');
      }
    }
  };

  const handleEdit = (discurso) => {
    setEditando(discurso.id);
    setFormData({
      numero: discurso.numero,
      tema: discurso.tema,
      data_versao_esboco: discurso.data_versao_esboco ? format(new Date(discurso.data_versao_esboco), 'yyyy-MM-dd') : ''
    });
    setShowModal(true);
  };

  const handleVerHistorico = async (discurso) => {
    try {
      const response = await getHistoricoDiscurso(discurso.id);
      setHistoricoSelecionado(response.data);
      setShowHistorico(true);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      alert('Erro ao carregar histórico');
    }
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      tema: '',
      data_versao_esboco: ''
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
            <h2>Discursos</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Novo Discurso
              </button>
            )}
          </div>

        <SearchBar
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por número ou tema..."
        />

        {discursos.length > 0 && (
          <div className="results-count">
            Mostrando <strong>{discursos.length}</strong> de <strong>{total}</strong> discursos
          </div>
        )}

        {discursos.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum discurso cadastrado</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tema</th>
                  <th>Versão do Esboço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {discursos.map((discurso) => (
                  <tr key={discurso.id}>
                    <td><strong>#{discurso.numero}</strong></td>
                    <td>{discurso.tema}</td>
                    <td>
                      {discurso.data_versao_esboco
                        ? format(new Date(discurso.data_versao_esboco), 'dd/MM/yyyy')
                        : 'N/A'}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleVerHistorico(discurso)}>
                          Histórico
                        </button>
                        {usuarioLogado?.role === 'admin' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(discurso)}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(discurso.id)}>
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
        {discursos.length < total && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-light" onClick={() => carregarDiscursos(false)} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais →'}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Discurso' : 'Novo Discurso'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Número *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Tema *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Data da Versão do Esboço</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.data_versao_esboco}
                  onChange={(e) => setFormData({ ...formData, data_versao_esboco: e.target.value })}
                />
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
              <h3>Histórico de Discursos</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowHistorico(false)}>
                ✕
              </button>
            </div>

            {historicoSelecionado.length === 0 ? (
              <div className="empty-state">
                <p>Este discurso ainda não foi proferido</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Orador</th>
                      <th>Congregação</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoSelecionado.map((item) => (
                      <tr key={item.id}>
                        <td>{format(new Date(item.data), 'dd/MM/yyyy')}</td>
                        <td>{item.orador_nome || 'N/A'}</td>
                        <td>{item.congregacao_nome || 'Nossa Congregação'}</td>
                        <td>
                          <span className={`badge badge-${item.tipo}`}>
                            {item.tipo === 'local' ? 'Local' : item.tipo === 'enviado' ? 'Enviar' : 'Receber'}
                          </span>
                        </td>
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

export default Discursos;

