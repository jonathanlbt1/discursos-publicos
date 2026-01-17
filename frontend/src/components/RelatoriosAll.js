import React, { useEffect, useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/Reports.css';
import api, { getCongregacoesList, getOradores } from '../services/api';

export default function RelatoriosAll() {
  const [mesSelecionado, setMesSelecionado] = useState(new Date());
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [tiposDiscursoSelecionados, setTiposDiscursoSelecionados] = useState([]);
  const [oradoresJardimSantista, setOradoresJardimSantista] = useState([]);
  const [oradoresSelecionados, setOradoresSelecionados] = useState([]);
  const [congregacaoJardimSantista, setCongregacaoJardimSantista] = useState(null);
  // legacy Jardim Santista JSON view removed — no local state required

  useEffect(() => {
    (async () => {
      try {
        const resp = await getCongregacoesList();
        const data = resp.data;
        const list = Array.isArray(data) ? data : (data.items || []);
        
        // Buscar congregação Jardim Santista
        const jardimSantista = list.find(c => c.nome && c.nome.toLowerCase().includes('jardim santista'));
        if (jardimSantista) {
          setCongregacaoJardimSantista(jardimSantista);
          // Buscar apenas oradores ATIVOS da congregação Jardim Santista
          const oradoresResp = await getOradores({ congregacao_id: jardimSantista.id, ativo: true });
          const oradoresData = oradoresResp.data || { items: [] };
          // Filtrar apenas oradores ativos (garantia adicional)
          const oradoresAtivos = (oradoresData.items || []).filter(o => o.ativo !== false);
          setOradoresJardimSantista(oradoresAtivos);
        }
      } catch (err) {
        console.error('Erro ao buscar congregações:', err);
      }
    })();
  }, []);

  // Limpar seleção de oradores que foram marcados como inativos
  useEffect(() => {
    if (oradoresJardimSantista.length > 0 && oradoresSelecionados.length > 0) {
      const idsAtivos = new Set(oradoresJardimSantista.map(o => o.id));
      const selecionadosValidos = oradoresSelecionados.filter(id => idsAtivos.has(id));
      if (selecionadosValidos.length !== oradoresSelecionados.length) {
        setOradoresSelecionados(selecionadosValidos);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oradoresJardimSantista]);

  const baixarBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const gerarPDF = async (endpoint, filename) => {
    setGerandoRelatorio(true);
    try {
      const response = await api.get(`/reports/${endpoint}`, { responseType: 'blob' });
      baixarBlob(response.data, filename);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar relatório. Verifique o console.');
    } finally {
      setGerandoRelatorio(false);
    }
  };

  const gerarProgramacaoMensal = async () => {
    const mes = format(mesSelecionado, 'MM');
    const ano = format(mesSelecionado, 'yyyy');
    const nomeMes = format(mesSelecionado, 'MMMM-yyyy', { locale: ptBR });
    let url = `programacao-mensal?mes=${mes}&ano=${ano}`;
    if (tiposDiscursoSelecionados.length > 0) {
      // Enviar múltiplos tipos separados por vírgula
      url += `&tipo=${tiposDiscursoSelecionados.join(',')}`;
    }
    await gerarPDF(url, `programacao-${nomeMes}.pdf`);
  };

  const handleTipoChange = (tipo) => {
    setTiposDiscursoSelecionados(prev => {
      if (prev.includes(tipo)) {
        // Remove se já estiver selecionado
        return prev.filter(t => t !== tipo);
      } else {
        // Adiciona se não estiver selecionado
        return [...prev, tipo];
      }
    });
  };

  const handleOradorToggle = (oradorId) => {
    setOradoresSelecionados(prev => {
      if (prev.includes(oradorId)) {
        return prev.filter(id => id !== oradorId);
      } else {
        return [...prev, oradorId];
      }
    });
  };

  const selecionarTodosOradores = () => {
    if (oradoresSelecionados.length === oradoresJardimSantista.length) {
      setOradoresSelecionados([]);
    } else {
      setOradoresSelecionados(oradoresJardimSantista.map(o => o.id));
    }
  };

  const gerarOradoresPorCongregacao = async () => {
    if (!congregacaoJardimSantista) {
      return alert('Congregação Jardim Santista não encontrada.');
    }
    if (oradoresSelecionados.length === 0) {
      return alert('Selecione pelo menos um orador para gerar o relatório.');
    }
    const oradoresIds = oradoresSelecionados.join(',');
    const safe = (congregacaoJardimSantista.nome || 'oradores').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await gerarPDF(`oradores-por-congregacao?congregacao_id=${congregacaoJardimSantista.id}&oradores_ids=${oradoresIds}`, `oradores-${safe}.pdf`);
  };



  return (
    <div className="card">
      <h2>📊 Relatórios</h2>
      <p className="muted">Gere relatórios em PDF. Selecione opções abaixo e clique em "Gerar PDF".</p>

      <div className="reports-grid">
        {/* Agendamentos futuros */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>📅</div>
          <h3>Agendamentos Futuros</h3>
          <p>Lista completa de todos os agendamentos programados</p>
          <ul className="report-details">
            <li>Data e horário</li>
            <li>Discurso e orador</li>
            <li>Tipo e congregação</li>
            <li>Observações</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => gerarPDF('agendamentos-futuros', 'agendamentos-futuros.pdf')} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Histórico de discursos */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>📚</div>
          <h3>Histórico de Discursos</h3>
          <p>Histórico completo de todos os discursos já proferidos</p>
          <ul className="report-details">
            <li>Número e tema</li>
            <li>Quantas vezes foi proferido</li>
            <li>Datas e oradores</li>
            <li>Primeira e última vez</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => gerarPDF('historico-discursos', 'historico-discursos.pdf')} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Oradores */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>👥</div>
          <h3>Relatório de Oradores</h3>
          <p>Lista de oradores com histórico de discursos enviados</p>
          <ul className="report-details">
            <li>Nome e contatos</li>
            <li>Status (ativo/inativo)</li>
            <li>Total de discursos enviados</li>
            <li>Últimos 5 discursos</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => gerarPDF('oradores', 'relatorio-oradores.pdf')} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Programação mensal */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>📆</div>
          <h3>Programação Mensal</h3>
          <p>Programação completa de um mês específico</p>
          <div className="month-selector">
            <button className="btn btn-secondary btn-sm" onClick={() => setMesSelecionado(subMonths(mesSelecionado, 1))}>←</button>
            <span className="month-display">{format(mesSelecionado, 'MMMM yyyy', { locale: ptBR })}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setMesSelecionado(addMonths(mesSelecionado, 1))}>→</button>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Tipo de discurso:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={tiposDiscursoSelecionados.includes('local')}
                  onChange={() => handleTipoChange('local')}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                Local
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={tiposDiscursoSelecionados.includes('enviado')}
                  onChange={() => handleTipoChange('enviado')}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                Enviar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={tiposDiscursoSelecionados.includes('recebido')}
                  onChange={() => handleTipoChange('recebido')}
                  style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                />
                Receber
              </label>
            </div>
            {tiposDiscursoSelecionados.length === 0 && (
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                Nenhum tipo selecionado = Todos os tipos
              </small>
            )}
          </div>
          <button className="btn btn-primary btn-block" onClick={gerarProgramacaoMensal} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Estatísticas */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>📈</div>
          <h3>Relatório Estatístico</h3>
          <p>Estatísticas gerais e rankings do sistema</p>
          <ul className="report-details">
            <li>Estatísticas gerais</li>
            <li>Top 10 discursos mais proferidos</li>
            <li>Top 10 oradores mais ativos</li>
            <li>Análises e métricas</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => gerarPDF('estatisticas', 'relatorio-estatisticas.pdf')} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Discursos disponíveis */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>✅</div>
          <h3>Discursos Disponíveis</h3>
          <p>Discursos que podem ser agendados (regra de 6/12 meses)</p>
          <ul className="report-details">
            <li>Disponíveis (&gt;12 meses)</li>
            <li>Com atenção (6-12 meses)</li>
            <li>Indisponíveis (&lt;6 meses)</li>
            <li>Nunca proferidos</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => gerarPDF('discursos-disponiveis', 'discursos-disponiveis.pdf')} disabled={gerandoRelatorio}>
            {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF'}
          </button>
        </div>

        {/* Oradores da Jardim Santista (novo) */}
        <div className="report-card">
          <div className="report-icon" style={{ background: 'linear-gradient(135deg, #7f7fd5 0%, #86a8e7 100%)' }}>🏷️</div>
          <h3>Oradores da Jardim Santista</h3>
          <p>Selecione os oradores da congregação Jardim Santista para gerar o relatório com seus discursos.</p>
          {congregacaoJardimSantista ? (
            <>
              <div style={{ margin: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>Oradores da congregação {congregacaoJardimSantista.nome}:</label>
                  <button 
                    type="button"
                    onClick={selecionarTodosOradores}
                    className="oradores-select-all-btn"
                  >
                    {oradoresSelecionados.length === oradoresJardimSantista.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
                <div className="oradores-list-container">
                  {oradoresJardimSantista.length === 0 ? (
                    <p className="oradores-list-empty">Nenhum orador encontrado.</p>
                  ) : (
                    oradoresJardimSantista.map(orador => (
                      <label 
                        key={orador.id} 
                        className="oradores-list-item"
                      >
                        <input
                          type="checkbox"
                          checked={oradoresSelecionados.includes(orador.id)}
                          onChange={() => handleOradorToggle(orador.id)}
                          style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                        />
                        {orador.nome}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <button 
                className="btn btn-primary btn-block" 
                onClick={gerarOradoresPorCongregacao} 
                disabled={gerandoRelatorio || oradoresSelecionados.length === 0}
              >
                {gerandoRelatorio ? 'Gerando...' : '📄 Gerar PDF de Oradores'}
              </button>
            </>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Carregando oradores...</p>
          )}
        </div>

        {/* Legacy 'Jardim Santista' card removed — kept for backward compatibility on the API side, but
            the UI no longer exposes the legacy JSON report. Use 'Oradores por Congregação' instead. */}
      </div>

      {gerandoRelatorio && (
        <div className="alert alert-info" style={{ marginTop: '2rem' }}>
          ⏳ Gerando relatório PDF... Aguarde.
        </div>
      )}

  {/* legacy JSON view removed */}

      <div className="reports-help" style={{ marginTop: '1.5rem' }}>
        <h3>💡 Dicas de Uso</h3>
        <ul>
          <li><strong>Agendamentos Futuros:</strong> Ideal para planejamento e compartilhamento com a congregação</li>
          <li><strong>Histórico:</strong> Veja quais discursos já foram proferidos e quando</li>
          <li><strong>Oradores:</strong> Acompanhe a participação de cada irmão</li>
          <li><strong>Programação Mensal:</strong> Imprima e fixe no quadro de avisos</li>
          <li><strong>Estatísticas:</strong> Análise detalhada para coordenadores</li>
          <li><strong>Disponíveis:</strong> Planeje quais discursos agendar baseado nas regras</li>
        </ul>
      </div>
    </div>
  );
}
