/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { getCongregacoes, createCongregacao, updateCongregacao, deleteCongregacao, getHistoricoCongregacao } from '../services/api';
import { format } from 'date-fns';
import SearchBar from './SearchBar';

function Congregacoes({ usuarioLogado }) {
  const [congregacoes, setCongregacoes] = useState([]);
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
    nome: '',
    endereco: '',
    horario: '',
    nome_contato: '',
    celular_contato: '',
    dia_semana: ''
  });

  const PAGE_LIMIT = 25;

  // load initial data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    carregarCongregacoes(true);
  }, []);

  // when search changes, reload with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Limpar o timeout anterior se existir
    if (buscaDebounceRef.current) {
      clearTimeout(buscaDebounceRef.current);
    }

    // Se busca estiver vazia, buscar imediatamente
    if (busca === '') {
      carregarCongregacoes(true);
      setOffset(0);
      return;
    }

    // Criar novo timeout para buscar após 200ms sem digitação
    buscaDebounceRef.current = setTimeout(() => {
      carregarCongregacoes(true);
      setOffset(0);
    }, 200);

    // Cleanup: limpar timeout se componente desmontar ou busca mudar novamente
    return () => {
      if (buscaDebounceRef.current) {
        clearTimeout(buscaDebounceRef.current);
      }
    };
  }, [busca]);

  const carregarCongregacoes = async (reset = false) => {
    try {
      // Só mostrar loading completo no carregamento inicial
      if (reset && isInitialLoad.current) {
        setLoading(true);
        setCongregacoes([]);
        setOffset(0);
      } else if (reset) {
        // Para buscas, não mostrar loading que bloqueia a tela
        setCongregacoes([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      const params = {
        busca: busca || undefined,
        limit: PAGE_LIMIT,
        offset: reset ? 0 : offset + PAGE_LIMIT
      };

      const response = await getCongregacoes(params);
      const data = response.data || { items: [], total: 0 };
      if (reset) {
        setCongregacoes(data.items);
        setTotal(data.total || 0);
        setOffset(0);
      } else {
        setCongregacoes(prev => [...prev, ...(data.items || [])]);
        setOffset(prev => prev + PAGE_LIMIT);
      }
    } catch (error) {
      console.error('Erro ao carregar congregações:', error);
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
      if (editando) {
        await updateCongregacao(editando, formData);
      } else {
        await createCongregacao(formData);
      }
      setShowModal(false);
      resetForm();
      // Recarrega a lista resetando para o início, respeitando os filtros atuais
      carregarCongregacoes(true);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar congregação');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta congregação?')) {
      try {
        await deleteCongregacao(id);
        // Recarrega a lista resetando para o início, respeitando os filtros atuais
        carregarCongregacoes(true);
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir congregação');
      }
    }
  };

  const handleEdit = (congregacao) => {
    setEditando(congregacao.id);
    setFormData({
      nome: congregacao.nome,
      endereco: congregacao.endereco || '',
      horario: congregacao.horario || '',
      nome_contato: congregacao.nome_contato || '',
      celular_contato: congregacao.celular_contato || '',
      dia_semana: congregacao.dia_semana || ''
    });
    setShowModal(true);
  };

  const handleVerHistorico = async (congregacao) => {
    try {
      const response = await getHistoricoCongregacao(congregacao.id);
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
      endereco: '',
      horario: '',
      nome_contato: '',
      celular_contato: '',
      dia_semana: ''
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
            <h2>Congregações</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Nova Congregação
              </button>
            )}
          </div>

        <SearchBar
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por nome, endereço ou contato..."
        />

        {congregacoes.length > 0 && (
          <div className="results-count">
            Mostrando <strong>{congregacoes.length}</strong> de <strong>{total}</strong> congregações
          </div>
        )}

        {congregacoes.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma congregação cadastrada</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Endereço</th>
                  <th>Dia da Semana</th>
                  <th>Horário</th>
                  <th>Contato</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {congregacoes.map((congregacao) => (
                  <tr key={congregacao.id}>
                    <td><strong>{congregacao.nome}</strong></td>
                    <td>{congregacao.endereco || 'N/A'}</td>
                    <td>{congregacao.dia_semana || 'N/A'}</td>
                    <td>{congregacao.horario || 'N/A'}</td>
                    <td>
                      {congregacao.nome_contato && (
                        <div>
                          <div>{congregacao.nome_contato}</div>
                          <small style={{ color: '#666' }}>{congregacao.celular_contato}</small>
                        </div>
                      )}
                      {!congregacao.nome_contato && 'N/A'}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleVerHistorico(congregacao)}>
                          Histórico
                        </button>
                        {usuarioLogado?.role === 'admin' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(congregacao)}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(congregacao.id)}>
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
        {congregacoes.length < total && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-light" onClick={() => carregarCongregacoes(false)} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais →'}
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Congregação' : 'Nova Congregação'}</h3>
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
                <label>Endereço</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Dia da Semana</label>
                <select
                  className="form-control"
                  value={formData.dia_semana}
                  onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                >
                  <option value="">Selecione o dia</option>
                  <option value="Domingo">Domingo</option>
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Horário</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  placeholder="Ex: 10h"
                />
              </div>

              <div className="form-group">
                <label>Nome do Contato</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.nome_contato}
                  onChange={(e) => setFormData({ ...formData, nome_contato: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Celular do Contato</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.celular_contato}
                  onChange={(e) => setFormData({ ...formData, celular_contato: e.target.value })}
                  placeholder="(00) 00000-0000"
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
              <h3>Histórico de Oradores Recebidos</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowHistorico(false)}>
                ✕
              </button>
            </div>

            {historicoSelecionado.length === 0 ? (
              <div className="empty-state">
                <p>Esta congregação ainda não enviou oradores</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Discurso</th>
                      <th>Orador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoSelecionado.map((item) => (
                      <tr key={item.id}>
                        <td>{format(new Date(item.data), 'dd/MM/yyyy')}</td>
                        <td><strong>#{item.numero}</strong> - {item.tema}</td>
                        <td>{item.orador_nome}</td>
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

export default Congregacoes;

// Ain't no sunshine when she's gone