import React, { useState, useEffect } from 'react';
import { getAgendamentosFuturos, verificarSemanasVazias, exportarCSV } from '../services/api';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function Dashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [semanasVazias, setSemanasVazias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    carregarDados();

    // Listen for agendamento creations elsewhere in the app and refresh
    const handleAgendamentoCreated = () => {
      carregarDados();
    };
    window.addEventListener('agendamentoCreated', handleAgendamentoCreated);

    return () => {
      window.removeEventListener('agendamentoCreated', handleAgendamentoCreated);
    };
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [agendamentosRes, semanasRes] = await Promise.all([
        getAgendamentosFuturos({ limit: 25, offset: 0 }),
        verificarSemanasVazias()
      ]);
      setAgendamentos(agendamentosRes.data.items || []);
      setTotal(agendamentosRes.data.total || 0);
      setOffset(0);
      setSemanasVazias(semanasRes.data.semanasVazias || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async () => {
    try {
      const response = await exportarCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agendamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar CSV');
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

  return (
    <div>
      {/* Verse highlight */}
      <div className="verse-highlight">
        <div>
          <strong>1 Coríntios 14:40</strong> — que todas as coisas ocorram com decência e ordem.
        </div>
        <div className="verse-date">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{total}</h3>
          <p>Agendamentos Futuros</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h3>{semanasVazias.length}</h3>
          <p>Semanas sem Discurso</p>
        </div>
      </div>

      {semanasVazias.length > 0 && (
        <div className="card">
          <h2>⚠️ Semanas sem Discurso Programado</h2>
          {semanasVazias.map((semana, index) => (
            <div key={index} className="alert alert-warning">
              <span>📅</span>
              <span>{semana.aviso}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Próximos Agendamentos</h2>
          <button className="btn btn-success btn-sm" onClick={handleExportarCSV}>
            📥 Exportar CSV
          </button>
        </div>

        {agendamentos.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum agendamento futuro cadastrado</p>
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
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((ag) => (
                  <tr key={ag.id}>
                      <td>{(() => {
                        try {
                          const d = typeof ag.data === 'string' ? (ag.data.includes('T') ? parseISO(ag.data) : parseISO(ag.data)) : new Date(ag.data);
                          return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : '—';
                        } catch (e) {
                          return '—';
                        }
                      })()}</td>
                    <td>
                      <strong>#{ag.discurso_numero}</strong> - {ag.discurso_tema}
                    </td>
                    <td>{ag.orador_nome || 'N/A'}</td>
                    <td>{ag.congregacao_nome || 'Nossa Congregação'}</td>
                    <td>
                      <span className={`badge ${getTipoBadgeClass(ag.tipo)}`}>
                        {getTipoLabel(ag.tipo)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {agendamentos.length < total && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button className="btn btn-light" onClick={async () => {
              try {
                setLoadingMore(true);
                const resp = await getAgendamentosFuturos({ limit: 25, offset: offset + 25 });
                setAgendamentos(prev => [...prev, ...(resp.data.items || [])]);
                setOffset(prev => prev + 25);
              } catch (e) {
                console.error('Erro ao carregar mais agendamentos:', e);
              } finally {
                setLoadingMore(false);
              }
            }} disabled={loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

