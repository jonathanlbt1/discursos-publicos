/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { getArranjos, createArranjo, updateArranjo, deleteArranjo, getCongregacoes } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function Arranjos({ usuarioLogado }) {
  const [arranjos, setArranjos] = useState([]);
  const [arranjosPassados, setArranjosPassados] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMorePassados, setLoadingMorePassados] = useState(false);
  const [congregacoes, setCongregacoes] = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [ordemInvertida, setOrdemInvertida] = useState(false);

  const [formData, setFormData] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    congregacoes: []
  });

  const PAGE_LIMIT = 25;

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  // load initial data
  useEffect(() => {
    carregarArranjos(true);
    carregarCongregacoes();
  }, []);

  const carregarCongregacoes = async () => {
    try {
      const resp = await getCongregacoes({ limit: 1000 });
      setCongregacoes((resp.data && resp.data.items) || []);
    } catch (error) {
      console.error('Erro ao carregar congregações:', error);
    }
  };

  // Função auxiliar para verificar se um arranjo já passou
  const isArranjoPassado = (ano, mes) => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
    
    if (ano < anoAtual) return true;
    if (ano === anoAtual && mes < mesAtual) return true;
    return false;
  };

  const carregarArranjos = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setArranjos([]);
        setArranjosPassados([]);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }

      // Carregar em lotes maiores para garantir que temos futuros suficientes
      const params = {
        limit: PAGE_LIMIT * 3, // Carregar mais para separar futuros e passados
        offset: reset ? 0 : offset
      };

      const response = await getArranjos(params);
      const data = response.data || { items: [], total: 0 };
      
      // Separar arranjos futuros/presentes dos passados
      const futuros = [];
      const passados = [];
      
      (data.items || []).forEach(arranjo => {
        if (isArranjoPassado(arranjo.ano, arranjo.mes)) {
          passados.push(arranjo);
        } else {
          futuros.push(arranjo);
        }
      });

      if (reset) {
        setArranjos(futuros);
        // Guardar apenas os primeiros passados para exibir no histórico se houver
        setArranjosPassados(passados.slice(0, PAGE_LIMIT));
        setTotal(data.total || 0);
        setOffset(data.items.length);
      } else {
        // Adicionar apenas futuros à lista principal (evitando duplicatas)
        setArranjos(prev => {
          const idsExistentes = new Set(prev.map(a => a.id));
          const novosFuturos = futuros.filter(a => !idsExistentes.has(a.id));
          return [...prev, ...novosFuturos];
        });
        // Adicionar passados ao histórico apenas se já estiver expandido (evitando duplicatas)
        if (mostrarHistorico && passados.length > 0) {
          setArranjosPassados(prev => {
            const idsExistentes = new Set(prev.map(a => a.id));
            const novosPassados = passados.filter(a => !idsExistentes.has(a.id));
            return [...prev, ...novosPassados];
          });
        }
        setOffset(prev => prev + data.items.length);
      }
    } catch (error) {
      console.error('Erro ao carregar arranjos:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const carregarArranjosPassados = async () => {
    try {
      setLoadingMorePassados(true);
      
      // Carregar a partir do offset geral atual, buscando mais arranjos
      // Como os passados estão misturados com futuros, usamos o offset geral
      const params = {
        limit: PAGE_LIMIT * 3,
        offset: offset
      };

      const response = await getArranjos(params);
      const data = response.data || { items: [], total: 0 };
      
      // Separar futuros e passados
      const futuros = [];
      const passados = [];
      
      (data.items || []).forEach(arranjo => {
        if (isArranjoPassado(arranjo.ano, arranjo.mes)) {
          passados.push(arranjo);
        } else {
          futuros.push(arranjo);
        }
      });
      
      // Adicionar futuros à lista principal (evitando duplicatas)
      if (futuros.length > 0) {
        setArranjos(prev => {
          const idsExistentes = new Set(prev.map(a => a.id));
          const novosFuturos = futuros.filter(a => !idsExistentes.has(a.id));
          return [...prev, ...novosFuturos];
        });
      }
      
      // Adicionar passados ao histórico (evitando duplicatas)
      if (passados.length > 0) {
        setArranjosPassados(prev => {
          const idsExistentes = new Set(prev.map(a => a.id));
          const novosPassados = passados.filter(a => !idsExistentes.has(a.id));
          return [...prev, ...novosPassados];
        });
      }
      
      // Atualizar offset geral
      if (data.items.length > 0) {
        setOffset(prev => prev + data.items.length);
      }
    } catch (error) {
      console.error('Erro ao carregar arranjos passados:', error);
    } finally {
      setLoadingMorePassados(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.congregacoes || formData.congregacoes.length === 0) {
        alert('Selecione pelo menos uma congregação');
        return;
      }

      const payload = {
        ano: parseInt(formData.ano, 10),
        mes: parseInt(formData.mes, 10),
        congregacoes: formData.congregacoes.map(c => ({ id: parseInt(c, 10) }))
      };

      if (editando) {
        await updateArranjo(editando, payload);
      } else {
        await createArranjo(payload);
      }
      setShowModal(false);
      resetForm();
      carregarArranjos(true);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao salvar arranjo';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este arranjo?')) {
      try {
        await deleteArranjo(id);
        carregarArranjos(true);
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir arranjo');
      }
    }
  };

  const handleEdit = (arranjo) => {
    setEditando(arranjo.id);
    setFormData({
      ano: arranjo.ano,
      mes: arranjo.mes,
      congregacoes: arranjo.congregacoes ? arranjo.congregacoes.map(c => String(c.id)) : []
    });
    setShowModal(true);
  };

  const handleCongregacaoToggle = (congregacaoId) => {
    const idStr = String(congregacaoId);
    setFormData(prev => {
      const todas = prev.congregacoes || [];
      if (todas.includes(idStr)) {
        return { ...prev, congregacoes: todas.filter(id => id !== idStr) };
      } else {
        return { ...prev, congregacoes: [...todas, idStr] };
      }
    });
  };

  const resetForm = () => {
    setFormData({
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      congregacoes: []
    });
    setEditando(null);
  };

  const getNomeMes = (mes) => {
    const mesObj = meses.find(m => m.value === mes);
    return mesObj ? mesObj.label : `Mês ${mes}`;
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Arranjos</h2>
            {usuarioLogado?.role === 'admin' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Novo Arranjo
              </button>
            )}
          </div>

        {arranjos.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="results-count">
              Mostrando <strong>{arranjos.length}</strong> arranjos futuros/presentes
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ordemInvertida}
                onChange={(e) => setOrdemInvertida(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem' }}>Ordenar do mais distante</span>
            </label>
          </div>
        )}

        {arranjos.length === 0 && arranjosPassados.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum arranjo cadastrado</p>
          </div>
        ) : (
          <>
            {arranjos.length > 0 && (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ano</th>
                      <th>Mês</th>
                      <th>Congregações</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ordemInvertida ? [...arranjos].reverse() : arranjos).map((arranjo) => (
                      <tr key={arranjo.id}>
                        <td><strong>{arranjo.ano}</strong></td>
                        <td>{getNomeMes(arranjo.mes)}</td>
                        <td>
                          {arranjo.congregacoes && arranjo.congregacoes.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {arranjo.congregacoes.map((c, idx) => (
                                <span key={c.id || idx} className="badge badge-enviado" style={{ marginRight: '0.25rem' }}>
                                  {c.nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            'Nenhuma congregação'
                          )}
                        </td>
                        <td>
                          {usuarioLogado?.role === 'admin' ? (
                            <div className="actions">
                              <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(arranjo)}>
                                Editar
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(arranjo.id)}>
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
            
            {arranjos.length === 0 && arranjosPassados.length > 0 && (
              <div className="empty-state">
                <p>Nenhum arranjo futuro/presente cadastrado</p>
              </div>
            )}

            {/* Só mostrar "Carregar mais" se ainda houver mais arranjos para carregar */}
            {offset < total && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="btn btn-light" onClick={() => carregarArranjos(false)} disabled={loadingMore}>
                  {loadingMore ? 'Carregando...' : 'Carregar mais →'}
                </button>
              </div>
            )}

            {/* Seção de Histórico */}
            {arranjosPassados.length > 0 && (
              <div style={{ marginTop: '2rem', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Histórico</h3>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={async () => {
                      const novoEstado = !mostrarHistorico;
                      setMostrarHistorico(novoEstado);
                      // Se está expandindo pela primeira vez e há mais dados para carregar
                      if (novoEstado && offset < total) {
                        await carregarArranjosPassados();
                      }
                    }}
                  >
                    {mostrarHistorico ? 'Ocultar' : 'Mostrar'} Histórico ({arranjosPassados.length})
                  </button>
                </div>
                
                {mostrarHistorico && (
                  <>
                    <div className="table-responsive">
                      <table className="table" style={{ opacity: 0.7 }}>
                        <thead>
                          <tr>
                            <th>Ano</th>
                            <th>Mês</th>
                            <th>Congregações</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ordemInvertida ? [...arranjosPassados].reverse() : arranjosPassados).map((arranjo) => (
                            <tr key={arranjo.id}>
                              <td><strong>{arranjo.ano}</strong></td>
                              <td>{getNomeMes(arranjo.mes)}</td>
                              <td>
                                {arranjo.congregacoes && arranjo.congregacoes.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {arranjo.congregacoes.map((c, idx) => (
                                      <span key={c.id || idx} className="badge badge-enviado" style={{ marginRight: '0.25rem' }}>
                                        {c.nome}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  'Nenhuma congregação'
                                )}
                              </td>
                              <td>
                                {usuarioLogado?.role === 'admin' ? (
                                  <div className="actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(arranjo)}>
                                      Editar
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(arranjo.id)}>
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
                    {offset < total && (
                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button className="btn btn-light" onClick={carregarArranjosPassados} disabled={loadingMorePassados}>
                          {loadingMorePassados ? 'Carregando...' : 'Carregar mais histórico →'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Arranjo' : 'Novo Arranjo'}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ano *</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  min="2020"
                  max="2100"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mês *</label>
                <select
                  className="form-control"
                  value={formData.mes}
                  onChange={(e) => setFormData({ ...formData, mes: parseInt(e.target.value, 10) })}
                  required
                >
                  {meses.map((mes) => (
                    <option key={mes.value} value={mes.value}>
                      {mes.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Congregações *</label>
                <div className="congregacoes-list-container">
                  {congregacoes.length === 0 ? (
                    <p className="congregacoes-list-empty">Carregando congregações...</p>
                  ) : (
                    congregacoes.map((congregacao) => (
                      <label
                        key={congregacao.id}
                        className="congregacoes-list-item"
                      >
                        <input
                          type="checkbox"
                          checked={formData.congregacoes.includes(String(congregacao.id))}
                          onChange={() => handleCongregacaoToggle(congregacao.id)}
                          style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                        />
                        {congregacao.nome}
                      </label>
                    ))
                  )}
                </div>
                <small className="congregacoes-list-help">
                  Selecione uma ou mais congregações que participarão do arranjo
                </small>
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
    </div>
  );
}

export default Arranjos;

// Johnny Cash - Folsom Prison Blues