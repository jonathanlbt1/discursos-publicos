const Agendamento = require('../models/agendamento');
const { createEvents } = require('ics');
const { format, parseISO } = require('date-fns');

exports.exportarICS = async (req, res) => {
  try {
    const { ids } = req.query; // IDs dos agendamentos a exportar (opcional)
    
    let agendamentos;
    if (ids) {
      const idsList = ids.split(',').map(id => parseInt(id));
      const allAgendamentos = await Agendamento.getFuturos();
      agendamentos = allAgendamentos.filter(a => idsList.includes(a.id));
    } else {
      agendamentos = await Agendamento.getFuturos();
    }

    if (agendamentos.length === 0) {
      return res.status(404).json({ error: 'Nenhum agendamento encontrado' });
    }

    // Converter agendamentos para eventos ICS
    const events = agendamentos.map(ag => {
      const dataAgendamento = parseISO(ag.data);
      const ano = dataAgendamento.getFullYear();
      const mes = dataAgendamento.getMonth() + 1;
      const dia = dataAgendamento.getDate();

      let titulo = `Discurso #${ag.discurso_numero} - ${ag.discurso_tema}`;
      let descricao = `Discurso: #${ag.discurso_numero} - ${ag.discurso_tema}\n`;
      
      if (ag.orador_nome) {
        descricao += `Orador: ${ag.orador_nome}\n`;
      }
      
      if (ag.tipo === 'local') {
        descricao += 'Local: Nossa Congregação\n';
      } else if (ag.tipo === 'enviado') {
        titulo = `[ENVIADO] ${titulo}`;
        descricao += `Tipo: Enviar para ${ag.congregacao_nome}\n`;
      } else if (ag.tipo === 'recebido') {
        titulo = `[RECEBER] ${titulo}`;
        descricao += `Tipo: Receber de ${ag.congregacao_nome}\n`;
      }

      if (ag.observacoes) {
        descricao += `\nObservações: ${ag.observacoes}`;
      }

      return {
        start: [ano, mes, dia, 10, 0], // 10:00 AM por padrão
        duration: { hours: 1, minutes: 30 }, // 1h30 de duração
        title: titulo,
        description: descricao,
        location: ag.tipo === 'enviado' ? ag.congregacao_nome : 'Nossa Congregação',
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: { name: 'Sistema de Discursos', email: 'discursos@congregacao.local' }
      };
    });

    // Criar arquivo ICS
    createEvents(events, (error, value) => {
      if (error) {
        console.error('Erro ao criar ICS:', error);
        return res.status(500).json({ error: 'Erro ao gerar arquivo de calendário' });
      }

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=agendamentos.ics');
      res.send(value);
    });
  } catch (error) {
    console.error('Erro ao exportar calendário:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.exportarAgendamento = async (req, res) => {
  try {
    const { id } = req.params;
    const agendamento = await Agendamento.getById(id);

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const dataAgendamento = parseISO(agendamento.data);
    const ano = dataAgendamento.getFullYear();
    const mes = dataAgendamento.getMonth() + 1;
    const dia = dataAgendamento.getDate();

    let titulo = `Discurso #${agendamento.discurso_numero} - ${agendamento.discurso_tema}`;
    let descricao = `Discurso: #${agendamento.discurso_numero} - ${agendamento.discurso_tema}\n`;
    
    if (agendamento.orador_nome) {
      descricao += `Orador: ${agendamento.orador_nome}\n`;
    }
    
    if (agendamento.tipo === 'local') {
      descricao += 'Local: Nossa Congregação\n';
    } else if (agendamento.tipo === 'enviado') {
      titulo = `[ENVIADO] ${titulo}`;
      descricao += `Tipo: Enviado para ${agendamento.congregacao_nome}\n`;
    } else if (agendamento.tipo === 'recebido') {
      titulo = `[RECEBER] ${titulo}`;
      descricao += `Tipo: Receber de ${agendamento.congregacao_nome}\n`;
    }

    if (agendamento.observacoes) {
      descricao += `\nObservações: ${agendamento.observacoes}`;
    }

    const event = {
      start: [ano, mes, dia, 10, 0],
      duration: { hours: 1, minutes: 30 },
      title: titulo,
      description: descricao,
      location: agendamento.tipo === 'enviado' ? agendamento.congregacao_nome : 'Nossa Congregação',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'Sistema de Discursos', email: 'discursos@congregacao.local' }
    };

    createEvents([event], (error, value) => {
      if (error) {
        console.error('Erro ao criar ICS:', error);
        return res.status(500).json({ error: 'Erro ao gerar arquivo de calendário' });
      }

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=discurso-${agendamento.discurso_numero}.ics`);
      res.send(value);
    });
  } catch (error) {
    console.error('Erro ao exportar agendamento:', error);
    res.status(500).json({ error: error.message });
  }
};

// Retorna os próximos 4 discursos (tipo LOCAL ou RECEBIDO)
exports.getProximosDiscursos = async (req, res) => {
  try {
    const agendamentos = await Agendamento.getFuturos();
    // Filtra apenas discursos tipo 'local' ou 'recebido'
    const filtrados = agendamentos.filter(a => a.tipo === 'local' || a.tipo === 'recebido');
    // Ordena por data (caso não esteja ordenado)
    filtrados.sort((a, b) => new Date(a.data) - new Date(b.data));
    // Seleciona os próximos 4
    const proximos = filtrados.slice(0, 4);
    // Monta o payload
    const resposta = proximos.map(a => ({
      data: a.data,
      discurso: `#${a.discurso_numero} - ${a.discurso_tema}`,
      orador: a.orador_nome,
      congregacao: a.congregacao_nome
    }));
    res.json(resposta);
  } catch (error) {
    console.error('Erro ao buscar próximos discursos:', error);
    res.status(500).json({ error: error.message });
  }
};

