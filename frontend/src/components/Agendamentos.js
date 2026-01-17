/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  getAgendamentos,
  createAgendamento,
  updateAgendamento,
  deleteAgendamento,
  marcarComoRealizado,
  getDiscursos,
  getOradores,
  getCongregacoes,
  checkDisponibilidadeDiscurso
} from '../services/api';
import api from '../services/api';
import { format, parse, isValid } from 'date-fns';

// Helper: parse a date-only string (YYYY-MM-DD) into a local Date, return null if invalid
function safeParseDate(dateStr) {
  if (!dateStr) return null;
  try {
    // If it's already a Date object
    if (dateStr instanceof Date) return isValid(dateStr) ? dateStr : null;

    // If string contains time or ISO format (e.g. 2026-03-01T00:00:00.000Z), try Date constructor first
    if (typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.length > 10)) {
      const dt = new Date(dateStr);
      if (isValid(dt)) return dt;
    }

    // Fallback: parse YYYY-MM-DD
    const d = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : null;
  } catch (e) {
    return null;
  }
}

function Agendamentos({ usuarioLogado }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [discursos, setDiscursos] = useState([]);
  const [oradores, setOradores] = useState([]);
  const [congregacoes, setCongregacoes] = useState([]);
  const [jardimSantistaId, setJardimSantistaId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [alerta, setAlerta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCongregacao, setFiltroCongregacao] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [formData, setFormData] = useState({
    data: '',
    discurso_id: '',
    orador_id: '',
    congregacao_id: '',
    tipo: 'local',
    observacoes: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recentOccurrences, setRecentOccurrences] = useState([]);
  const [pendingCreateData, setPendingCreateData] = useState(null);
  const [dadosCarregados, setDadosCarregados] = useState(false);

  // load initial data (apenas dados auxiliares, sem agendamentos)
  useEffect(() => {
    const carregarDadosAuxiliares = async () => {
      try {
        // Carregar todos os discursos (sem limite)
        const carregarTodosDiscursos = async () => {
          const todosDiscursos = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;
          
          while (hasMore) {
            const response = await getDiscursos({ limit, offset });
            const data = response.data || { items: [], total: 0 };
            todosDiscursos.push(...(data.items || []));
            
            if (data.items.length < limit || todosDiscursos.length >= data.total) {
              hasMore = false;
            } else {
              offset += limit;
            }
          }
          
          return todosDiscursos;
        };
        
        // Load auxiliary lists
        const [todosDiscursos, oradoresRes, congregacoesRes] = await Promise.all([
          carregarTodosDiscursos(),
          getOradores({ limit: 1000 }),
          getCongregacoes({ limit: 1000 })
        ]);
        
        setDiscursos(todosDiscursos);
        setOradores(oradoresRes.data.items || []);
        const todasCongregacoes = congregacoesRes.data.items || [];
        setCongregacoes(todasCongregacoes);
        
        // Buscar congregação "Jardim Santista"
        const jardimSantista = todasCongregacoes.find(c => 
          c.nome && c.nome.toLowerCase().includes('jardim santista')
        );
        if (jardimSantista) {
          setJardimSantistaId(jardimSantista.id);
        }
        
        setDadosCarregados(true);
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);
      }
    };
    
    carregarDadosAuxiliares();
  }, []);

    const PAGE_LIMIT = 25;

    // Load agendamentos with pagination; reset=true replaces the list, otherwise append
    const carregarAgendamentos = async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          setAgendamentos([]);
          setOffset(0);
        } else {
          setLoadingMore(true);
        }

        const params = {
          busca: busca || undefined,
          tipo: filtroTipo && filtroTipo !== 'todos' ? filtroTipo : undefined,
          congregacao: filtroCongregacao || undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          limit: PAGE_LIMIT,
          offset: reset ? 0 : offset + PAGE_LIMIT
        };

        const resp = await getAgendamentos(params);
        const data = resp.data || { items: [], total: 0 };
        if (reset) {
          setAgendamentos(data.items || []);
          setTotal(data.total || 0);
          setOffset(0);
        } else {
          setAgendamentos(prev => [...prev, ...(data.items || [])]);
          setOffset(prev => prev + PAGE_LIMIT);
        }
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    // when filters change or dados are loaded, reload the first page
    useEffect(() => {
      if (dadosCarregados) {
        carregarAgendamentos(true);
      }
    }, [busca, filtroTipo, filtroCongregacao, dataInicio, dataFim, dadosCarregados]);

    const carregarDados = async () => {
      try {
        setLoading(true);
        
        // Carregar todos os discursos (sem limite)
        const carregarTodosDiscursos = async () => {
          const todosDiscursos = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;
          
          while (hasMore) {
            const response = await getDiscursos({ limit, offset });
            const data = response.data || { items: [], total: 0 };
            todosDiscursos.push(...(data.items || []));
            
            if (data.items.length < limit || todosDiscursos.length >= data.total) {
              hasMore = false;
            } else {
              offset += limit;
            }
          }
          
          return todosDiscursos;
        };
        
        // Load auxiliary lists
        const [todosDiscursos, oradoresRes, congregacoesRes] = await Promise.all([
          carregarTodosDiscursos(),
          getOradores({ limit: 1000 }),
          getCongregacoes({ limit: 1000 })
        ]);
        
        setDiscursos(todosDiscursos);
        setOradores(oradoresRes.data.items || []);
        const todasCongregacoes = congregacoesRes.data.items || [];
        setCongregacoes(todasCongregacoes);
        
        // Buscar congregação "Jardim Santista"
        const jardimSantista = todasCongregacoes.find(c => 
          c.nome && c.nome.toLowerCase().includes('jardim santista')
        );
        if (jardimSantista) {
          setJardimSantistaId(jardimSantista.id);
        }
        
        // Recarregar agendamentos após atualizar dados auxiliares
        await carregarAgendamentos(true);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        // Garantir que a data seja uma string no formato YYYY-MM-DD
        // O input type="date" já retorna isso, mas vamos garantir explicitamente
        const dataToSend = {
          ...formData,
          data: formData.data // Já está no formato correto do input type="date"
        };
        
        if (editando) {
          await updateAgendamento(editando, dataToSend);
        } else {
          try {
            const resp = await createAgendamento(dataToSend);
            // Notify other parts of the app (Dashboard) that a new agendamento was created
            try {
              window.dispatchEvent(new CustomEvent('agendamentoCreated', { detail: resp.data }));
            } catch (err) {
              // ignore if dispatch fails
            }
          } catch (error) {
            // If backend asks for confirmation (409 + confirmRequired), show modal with occurrences
            if (error && error.response && error.response.status === 409 && error.response.data && error.response.data.confirmRequired) {
              setRecentOccurrences(error.response.data.occurrences || []);
              setPendingCreateData(dataToSend);
              setShowConfirmModal(true);
              return;
            }
            throw error;
          }
        }
        setShowModal(false);
        resetForm();
        carregarDados();
      } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar agendamento');
      }
    };

    const handleConfirmCreate = async () => {
      if (!pendingCreateData) return;
      try {
        // Send with confirm flag so backend bypasses the check
        const resp = await createAgendamento({ ...pendingCreateData, confirm: true });
        try {
          window.dispatchEvent(new CustomEvent('agendamentoCreated', { detail: resp.data }));
        } catch (err) {}
        setShowConfirmModal(false);
        setPendingCreateData(null);
        setRecentOccurrences([]);
        setShowModal(false);
        resetForm();
        carregarDados();
      } catch (error) {
        console.error('Erro ao confirmar criação:', error);
        alert('Erro ao criar agendamento após confirmação');
      }
    };

    const handleDelete = async (id) => {
      if (window.confirm('Deseja realmente excluir este agendamento?')) {
        try {
          await deleteAgendamento(id);
          carregarDados();
        } catch (error) {
          console.error('Erro ao excluir:', error);
          alert('Erro ao excluir agendamento');
        }
      }
    };

    const handleMarcarRealizado = async (id) => {
      if (window.confirm('Marcar este agendamento como realizado? Ele será movido para o histórico.')) {
        try {
          await marcarComoRealizado(id);
          carregarDados();
        } catch (error) {
          console.error('Erro ao marcar como realizado:', error);
          alert('Erro ao marcar como realizado');
        }
      }
    };

    const gerarCartaConvite = async (agendamento) => {
      try {
        // Verificar se tem orador definido
        if (!agendamento.orador_id || !agendamento.orador_nome) {
          alert('É necessário definir um orador antes de gerar a carta convite.');
          return;
        }

        // Verificar se tem discurso definido
        if (!agendamento.discurso_id || !agendamento.discurso_numero) {
          alert('É necessário definir um discurso antes de gerar a carta convite.');
          return;
        }

        const response = await api.get(`/reports/carta-convite/${agendamento.id}`, {
          responseType: 'blob'
        });

        // Criar URL do blob e fazer download
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        const safeNome = (agendamento.orador_nome || 'orador').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.download = `carta-convite-${safeNome}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Erro ao gerar carta convite:', error);
        if (error.response && error.response.data && error.response.data.error) {
          alert(`Erro ao gerar carta convite: ${error.response.data.error}`);
        } else {
          alert('Erro ao gerar carta convite. Verifique o console.');
        }
      }
    };

    const handleEdit = (agendamento) => {
      setEditando(agendamento.id);
      const parsed = safeParseDate(agendamento.data);
      const tipo = agendamento.tipo || 'local';
      let congregacaoId = agendamento.congregacao_id || '';
      
      // Se for tipo local e não tiver congregacao_id ou for Jardim Santista, usar Jardim Santista
      if (tipo === 'local') {
        if (!congregacaoId && jardimSantistaId) {
          congregacaoId = String(jardimSantistaId);
        } else if (congregacaoId && jardimSantistaId && String(congregacaoId) === String(jardimSantistaId)) {
          congregacaoId = String(jardimSantistaId);
        }
      }
      
      setFormData({
        data: parsed ? format(parsed, 'yyyy-MM-dd') : '',
        discurso_id: agendamento.discurso_id || '',
        orador_id: agendamento.orador_id || '',
        congregacao_id: congregacaoId,
        tipo: tipo,
        observacoes: agendamento.observacoes || ''
      });
      setShowModal(true);
    };

    const resetForm = () => {
      setFormData({
        data: '',
        discurso_id: '',
        orador_id: '',
        congregacao_id: jardimSantistaId ? String(jardimSantistaId) : '',
        tipo: 'local',
        observacoes: ''
      });
      setEditando(null);
      setAlerta(null);
    };

    const handleOradorChange = (oradorId) => {
      const novoFormData = { ...formData, orador_id: oradorId };
      
      // Se estiver criando um novo agendamento (não editando) e o tipo não for 'local'
      // Preencher automaticamente a congregação do orador selecionado
      if (!editando && formData.tipo !== 'local' && oradorId) {
        const oradorSelecionado = oradores.find(o => String(o.id) === String(oradorId));
        if (oradorSelecionado && oradorSelecionado.congregacao_id) {
          novoFormData.congregacao_id = String(oradorSelecionado.congregacao_id);
        }
      }
      
      setFormData(novoFormData);
    };

    const handleDiscursoChange = async (discursoId) => {
      setFormData({ ...formData, discurso_id: discursoId });
    
      if (formData.tipo === 'local' && discursoId) {
        try {
          const response = await checkDisponibilidadeDiscurso(discursoId);
          setAlerta(response.data.alerta);
        } catch (error) {
          console.error('Erro ao verificar disponibilidade:', error);
        }
      }
    };

    const getTipoBadgeClass = (tipo) => {
      switch (tipo) {
        case 'local':
          return 'badge-local';
        case 'enviado':
          return 'badge-enviado';
        case 'recebido':
          return 'badge-recebido';
        default:
          return 'badge-local';
      }
    };

    const getTipoLabel = (tipo) => {
      switch (tipo) {
        case 'local':
          return 'Local';
        case 'enviado':
          return 'Enviar';
        case 'recebido':
          return 'Receber';
        default:
          return tipo;
      }
    };

    if (loading) {
      return <div className="loading">Carregando...</div>;
    }

  const listaExibir = agendamentos;

    return (
      <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Agendamentos</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Novo Agendamento
              </button>
            )}
          </div>

          {/* Filters: tipo and congregação */}
          <div className="filters-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '1rem' }}>
            <div className="filter-group" style={{ maxWidth: '220px', flex: '0 0 auto' }}>
              <label>Filtrar por tipo:</label>
                <select
                className="form-control"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="local">Local</option>
                <option value="enviado">Enviar</option>
                <option value="recebido">Receber</option>
              </select>
            </div>

            <div className="filter-group" style={{ maxWidth: '280px', flex: '0 0 auto' }}>
              <label>Filtrar por congregação:</label>
              <select
                className="form-control"
                value={filtroCongregacao}
                onChange={(e) => setFiltroCongregacao(e.target.value)}
              >
                <option value="">Todas</option>
                {congregacoes.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {listaExibir.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum agendamento cadastrado</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Discurso</th>
                    <th>Orador</th>
                    <th>Congregação</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                        <tbody>
                            {listaExibir.map((ag) => (
                              <tr key={ag.id}>
                                <td>{(() => {
                                  const d = safeParseDate(ag.data);
                                  return d ? format(d, 'dd/MM/yyyy') : '—';
                                })()}</td>
                      <td>
                        <strong>#{ag.discurso_numero}</strong> - {ag.discurso_tema}
                      </td>
                      <td>{ag.orador_nome || 'N/A'}</td>
                      <td>{ag.congregacao_nome || 'Jardim Santista'}</td>
                      <td>
                        <span className={`badge ${getTipoBadgeClass(ag.tipo)}`}>
                          {getTipoLabel(ag.tipo)}
                        </span>
                      </td>
                      <td>
                        {usuarioLogado?.role === 'admin' ? (
                          <div className="actions">
                            {(ag.tipo === 'local' || ag.tipo === 'enviado') && (
                              <button 
                                className="btn btn-info btn-sm" 
                                onClick={() => gerarCartaConvite(ag)}
                                title="Gerar Carta Convite"
                                style={{ marginRight: '0.25rem' }}
                              >
                                📄 Carta
                              </button>
                            )}
                            <button className="btn btn-success btn-sm" onClick={() => handleMarcarRealizado(ag.id)}>
                              ✓
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(ag)}>
                              Editar
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(ag.id)}>
                              Excluir
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {agendamentos.length < total && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-light" onClick={() => carregarAgendamentos(false)} disabled={loadingMore}>
                {loadingMore ? 'Carregando...' : 'Carregar mais →'}
              </button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editando ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>
                  ✕
                </button>
              </div>

              {alerta && (
                <div className={`alert alert-${alerta.tipo === 'erro' ? 'error' : 'warning'}`}>
                  <span>{alerta.tipo === 'erro' ? '⚠️' : 'ℹ️'}</span>
                  <span>{alerta.mensagem}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Data *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    className="form-control"
                    value={formData.tipo}
                    onChange={(e) => {
                      const novoTipo = e.target.value;
                      const novoFormData = { ...formData, tipo: novoTipo };
                      
                      // Se mudou para "local", preencher automaticamente com Jardim Santista
                      if (novoTipo === 'local' && jardimSantistaId) {
                        novoFormData.congregacao_id = String(jardimSantistaId);
                      } else if (novoTipo !== 'local') {
                        // Se mudou para "enviado" ou "recebido"
                        if (formData.congregacao_id === String(jardimSantistaId)) {
                          // Se estava como Jardim Santista, limpar ou preencher com congregação do orador
                          if (!editando && formData.orador_id) {
                            // Se estiver criando e tiver orador selecionado, preencher com congregação dele
                            const oradorSelecionado = oradores.find(o => String(o.id) === String(formData.orador_id));
                            if (oradorSelecionado && oradorSelecionado.congregacao_id) {
                              novoFormData.congregacao_id = String(oradorSelecionado.congregacao_id);
                            } else {
                              novoFormData.congregacao_id = '';
                            }
                          } else {
                            novoFormData.congregacao_id = '';
                          }
                        } else if (!editando && formData.orador_id && !novoFormData.congregacao_id) {
                          // Se não estava como Jardim Santista mas não tem congregação e tem orador, preencher
                          const oradorSelecionado = oradores.find(o => String(o.id) === String(formData.orador_id));
                          if (oradorSelecionado && oradorSelecionado.congregacao_id) {
                            novoFormData.congregacao_id = String(oradorSelecionado.congregacao_id);
                          }
                        }
                      }
                      
                      setFormData(novoFormData);
                      setAlerta(null);
                    }}
                    required
                  >
                    <option value="local">Local</option>
                    <option value="enviado">Enviar</option>
                    <option value="recebido">Receber</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Discurso *</label>
                  <select
                    className="form-control"
                    value={formData.discurso_id}
                    onChange={(e) => handleDiscursoChange(e.target.value)}
                    required
                  >
                    <option value="">Selecione um discurso</option>
                    {discursos.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.numero} - {d.tema}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Orador</label>
                  <select
                    className="form-control"
                    value={formData.orador_id}
                    onChange={(e) => handleOradorChange(e.target.value)}
                  >
                    <option value="">Selecione um orador</option>
                    {oradores.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.tipo === 'local' && (
                  <div className="form-group">
                    <label>Congregação</label>
                    <select
                      className="form-control"
                      value={formData.congregacao_id || (jardimSantistaId ? String(jardimSantistaId) : '')}
                      onChange={(e) => setFormData({ ...formData, congregacao_id: e.target.value })}
                      disabled={true}
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    >
                      {jardimSantistaId ? (
                        <option value={jardimSantistaId}>
                          {congregacoes.find(c => c.id === jardimSantistaId)?.nome || 'Jardim Santista'}
                        </option>
                      ) : (
                        <option value="">Carregando...</option>
                      )}
                    </select>
                    <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                      Para agendamentos locais, a congregação é automaticamente definida como "Jardim Santista"
                    </small>
                  </div>
                )}
                {(formData.tipo === 'enviado' || formData.tipo === 'recebido') && (
                  <div className="form-group">
                    <label>Congregação *</label>
                    <select
                      className="form-control"
                      value={formData.congregacao_id}
                      onChange={(e) => setFormData({ ...formData, congregacao_id: e.target.value })}
                      required
                    >
                      <option value="">Selecione uma congregação</option>
                      {congregacoes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Observações</label>
                  <textarea
                    className="form-control"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows="3"
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

          {showConfirmModal && (
          <div className="modal-overlay" onClick={() => { setShowConfirmModal(false); setPendingCreateData(null); setRecentOccurrences([]); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirmar criação</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowConfirmModal(false); setPendingCreateData(null); setRecentOccurrences([]); }}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>Este discurso foi identificado como já proferido nos últimos 180 dias. Deseja continuar e criar o agendamento mesmo assim?</p>
                <ul>
                  {recentOccurrences.map((r) => (
                    <li key={`${r.source}-${r.id}`}>{r.data} — {r.source === 'historico' ? 'Realizado' : 'Agendamento'} — Orador ID: {r.orador_id} — Tipo: {r.tipo}</li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setShowConfirmModal(false); setPendingCreateData(null); setRecentOccurrences([]); }}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleConfirmCreate}>
                  Confirmar e Criar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default Agendamentos;

// George Strait - Blue Clear Sky --- IGNORE ---