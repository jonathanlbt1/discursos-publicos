import React, { useState, useEffect } from 'react';
import { getAgendamentosFuturos } from '../services/api';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/Calendar.css';

function Calendario() {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  // local safe date parser to avoid timezone shifts when parsing date-only strings
  function safeParseDate(dateStr) {
    if (!dateStr) return null;
    try {
      if (dateStr instanceof Date) return dateStr;
      if (typeof dateStr === 'string' && (dateStr.includes('T') || dateStr.length > 10)) {
        const dt = new Date(dateStr);
        if (!isNaN(dt)) return dt;
      }
      // YYYY-MM-DD fallback
      const parts = String(dateStr).split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt)) return dt;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  const carregarAgendamentos = async () => {
    try {
      setLoading(true);
      const response = await getAgendamentosFuturos();
      // API returns paginated object { items, total }
      const data = response.data;
      setAgendamentos(data.items || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button className="btn btn-secondary btn-sm" onClick={() => setMesAtual(subMonths(mesAtual, 1))}>
          ← Anterior
        </button>
        <h2>{format(mesAtual, 'MMMM yyyy', { locale: ptBR })}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setMesAtual(addMonths(mesAtual, 1))}>
          Próximo →
        </button>
      </div>
    );
  };

  const renderDias = () => {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="calendar-days">
        {diasSemana.map(dia => (
          <div key={dia} className="calendar-day-name">
            {dia}
          </div>
        ))}
      </div>
    );
  };

  const renderCelulas = () => {
    const inicioMes = startOfMonth(mesAtual);
    const fimMes = endOfMonth(inicioMes);
    const inicioData = startOfWeek(inicioMes, { weekStartsOn: 0 });
    const fimData = endOfWeek(fimMes, { weekStartsOn: 0 });

    const rows = [];
    let dias = [];
    let dia = inicioData;

    while (dia <= fimData) {
      for (let i = 0; i < 7; i++) {
        const diaAtual = dia;
        const agendamentosDoDia = agendamentos.filter(ag => {
          const d = safeParseDate(ag.data);
          return d ? isSameDay(d, diaAtual) : false;
        });

        dias.push(
          <div
            key={dia}
            className={`calendar-cell ${
              !isSameMonth(dia, inicioMes) ? 'disabled' : ''
            } ${isSameDay(dia, new Date()) ? 'today' : ''} ${
              agendamentosDoDia.length > 0 ? 'has-events' : ''
            }`}
            onClick={() => agendamentosDoDia.length > 0 && setAgendamentoSelecionado(agendamentosDoDia)}
          >
            <span className="day-number">{format(dia, 'd')}</span>
            {agendamentosDoDia.length > 0 && (
              <div className="event-indicators">
                {agendamentosDoDia.map((ag, idx) => (
                  <div
                    key={idx}
                    className={`event-dot event-${ag.tipo}`}
                    title={`${ag.discurso_tema}`}
                  />
                ))}
              </div>
            )}
          </div>
        );
        dia = addDays(dia, 1);
      }
      rows.push(
        <div className="calendar-row" key={dia}>
          {dias}
        </div>
      );
      dias = [];
    }

    return <div className="calendar-body">{rows}</div>;
  };

  const exportarGoogle = () => {
    const agendamento = agendamentoSelecionado[0];
    const dataObj = safeParseDate(agendamento.data) || new Date();
    const dataFormatada = format(dataObj, "yyyyMMdd");
    
    const titulo = encodeURIComponent(`Discurso #${agendamento.discurso_numero} - ${agendamento.discurso_tema}`);
    const descricao = encodeURIComponent(`Orador: ${agendamento.orador_nome || 'N/A'}\nTipo: ${agendamento.tipo}`);
    const local = encodeURIComponent(agendamento.congregacao_nome || 'Nossa Congregação');
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataFormatada}T100000/${dataFormatada}T113000&details=${descricao}&location=${local}`;
    window.open(url, '_blank');
  };

  const exportarOutlook = () => {
    const agendamento = agendamentoSelecionado[0];
    const dataObj = safeParseDate(agendamento.data) || new Date();
    const dataInicio = format(dataObj, "yyyy-MM-dd") + "T10:00:00";
    const dataFim = format(dataObj, "yyyy-MM-dd") + "T11:30:00";
    
    const titulo = encodeURIComponent(`Discurso #${agendamento.discurso_numero} - ${agendamento.discurso_tema}`);
    const descricao = encodeURIComponent(`Orador: ${agendamento.orador_nome || 'N/A'}\nTipo: ${agendamento.tipo}`);
    const local = encodeURIComponent(agendamento.congregacao_nome || 'Nossa Congregação');
    
    const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${titulo}&body=${descricao}&location=${local}&startdt=${dataInicio}&enddt=${dataFim}`;
    window.open(url, '_blank');
  };

  const exportarICS = async () => {
    try {
      const ids = agendamentoSelecionado.map(ag => ag.id).join(',');
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:3001/api/calendar/export?ids=${ids}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agendamento.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Erro ao exportar ICS:', error);
      alert('Erro ao exportar calendário');
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

  if (loading) {
    return <div className="loading">Carregando calendário...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>📅 Calendário de Discursos</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={carregarAgendamentos}>
              🔄 Atualizar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setMesAtual(new Date())}>
              📍 Hoje
            </button>
          </div>
        </div>

        <div className="calendar-legend">
          <span className="legend-item">
            <span className="legend-dot event-local"></span> Local
          </span>
          <span className="legend-item">
            <span className="legend-dot event-enviado"></span> Enviar
          </span>
          <span className="legend-item">
            <span className="legend-dot event-recebido"></span> Receber
          </span>
        </div>

        <div className="calendar-container">
          {renderHeader()}
          {renderDias()}
          {renderCelulas()}
        </div>

        {agendamentos.length === 0 && (
          <div className="empty-state">
            <p>Nenhum agendamento futuro para exibir no calendário</p>
          </div>
        )}
      </div>

      {/* Modal de detalhes do agendamento */}
      {agendamentoSelecionado && (
        <div className="modal-overlay" onClick={() => setAgendamentoSelecionado(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Agendamento(s) do Dia</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setAgendamentoSelecionado(null)}>
                ✕
              </button>
            </div>

            <div className="agendamento-date">
              <p>
                <strong>Data:</strong>{' '}
                {(() => {
                  const d = safeParseDate(agendamentoSelecionado[0].data);
                  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                })()}
              </p>
            </div>

            {agendamentoSelecionado.map((ag, idx) => (
              <div 
                key={idx} 
                className="agendamento-card"
                style={{
                  borderLeft: `4px solid ${ag.tipo === 'local' ? '#1976d2' : ag.tipo === 'enviado' ? '#7b1fa2' : '#388e3c'}`
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className={`badge ${getTipoBadgeClass(ag.tipo)}`}>
                    {ag.tipo === 'local' ? 'Local' : ag.tipo === 'enviado' ? 'Enviar' : 'Receber'}
                  </span>
                </div>
                <h4>#{ag.discurso_numero} - {ag.discurso_tema}</h4>
                <p><strong>Orador:</strong> {ag.orador_nome || 'N/A'}</p>
                {ag.congregacao_nome && (
                  <p><strong>Congregação:</strong> {ag.congregacao_nome}</p>
                )}
                {ag.observacoes && (
                  <p><strong>Observações:</strong> {ag.observacoes}</p>
                )}
              </div>
            ))}

            <div className="modal-footer" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={exportarGoogle}>
                  📅 Google Calendar
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={exportarOutlook}>
                  📧 Outlook
                </button>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={exportarICS}>
                💾 Baixar .ics (iCal/Apple)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendario;

