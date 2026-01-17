const Agendamento = require('../models/agendamento');
const { format, addWeeks, addDays, parseISO, isValid } = require('date-fns');

// Helper para normalizar data recebida do frontend
function normalizeDateFromFrontend(dateValue) {
  if (!dateValue) return null;
  
  // Se já é uma string no formato YYYY-MM-DD, retorna diretamente
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Se é um objeto Date, extrai apenas a parte da data local
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Se é uma string ISO (com time), extrai apenas a parte da data
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  
  // Caso contrário, tenta converter para string
  return String(dateValue);
}

exports.getAll = async (req, res) => {
  try {
    const filters = {
      busca: req.query.busca,
      tipo: req.query.tipo,
      dataInicio: req.query.dataInicio,
      dataFim: req.query.dataFim,
      congregacao_id: req.query.congregacao || req.query.congregacao_id || undefined
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const agendamentos = await Agendamento.getAll(filters, { limit, offset });
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getFuturos = async (req, res) => {
  try {
    const filters = {
      busca: req.query.busca,
      tipo: req.query.tipo
    };
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    
    // Usar getAll com dataInicio para obter paginação correta e total
    const hoje = new Date().toISOString().split('T')[0];
    const filtersWithDate = {
      ...filters,
      dataInicio: hoje
    };
    
    const result = await Agendamento.getAll(filtersWithDate, { limit, offset });
    
    // Retornar no formato esperado pelo frontend: { items, total }
    res.json({
      items: result.items || [],
      total: result.total || 0
    });
  } catch (error) {
    console.error('Erro ao buscar agendamentos futuros:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const agendamento = await Agendamento.getById(req.params.id);
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json(agendamento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    // Basic validation to prevent DB constraint errors
    const { data: dataAgendamento, tipo } = req.body;
    if (!dataAgendamento || !tipo) {
      return res.status(400).json({ error: 'Campos obrigatórios: data e tipo' });
    }
    if (!['local', 'enviado', 'recebido'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use local, enviado ou recebido.' });
    }
    // Sanitize/normalize incoming payload to avoid sending empty strings for integer columns
    const parseNullableInt = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = parseInt(v, 10);
      return Number.isNaN(n) ? null : n;
    };

    // Normalizar a data recebida do frontend antes de passar para o model
    const dataNormalizada = normalizeDateFromFrontend(req.body.data);
    
    const payload = {
      ...req.body,
      data: dataNormalizada,
      discurso_id: parseNullableInt(req.body.discurso_id),
      orador_id: parseNullableInt(req.body.orador_id),
      congregacao_id: parseNullableInt(req.body.congregacao_id),
    };

    // Business rule: if the same discurso was proferido nos últimos 180 dias,
    // require explicit confirmation from the user before creating a new agendamento.
    const discursoId = payload.discurso_id;
    const confirmed = payload.confirm === true || payload.confirm === 'true' || payload.confirm === 1;

    if (discursoId) {
      const recentes = await Agendamento.getRecentDiscursoOccurrences(discursoId, 180);
      if (Array.isArray(recentes) && recentes.length > 0 && !confirmed) {
        // Return a 409 with details so frontend can show a confirmation modal
        return res.status(409).json({
          confirmRequired: true,
          message: 'Este discurso já foi proferido nos últimos 180 dias. Confirma criação?',
          occurrences: recentes
        });
      }
    }

    // Remove any confirm flag before creating the record
    if (payload.confirm !== undefined) delete payload.confirm;

    const agendamento = await Agendamento.create(payload);
    res.status(201).json(agendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error, 'payload:', req.body);
    // Return the error message to client (keeps existing behavior) but also log full error for debugging
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    // Normalizar a data recebida do frontend antes de passar para o model
    const dataNormalizada = normalizeDateFromFrontend(req.body.data);
    const payload = {
      ...req.body,
      data: dataNormalizada
    };
    
    const agendamento = await Agendamento.update(req.params.id, payload);
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json(agendamento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Agendamento.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.marcarComoRealizado = async (req, res) => {
  try {
    await Agendamento.marcarComoRealizado(req.params.id);
    res.json({ message: 'Agendamento marcado como realizado e movido para o histórico' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.exportarCSV = async (req, res) => {
  try {
    const agendamentos = await Agendamento.getFuturos();
    
    // Garantir que agendamentos é um array
    if (!Array.isArray(agendamentos)) {
      console.error('Erro: agendamentos não é um array no exportarCSV:', typeof agendamentos, agendamentos);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos para exportação' });
    }
    
    // Criar CSV
    let csv = 'Data,Congregação,Discurso,Orador,Tipo\n';
    
    agendamentos.forEach(ag => {
      try {
        // Usar safeParseDate se disponível, senão tentar formatar diretamente
        let dataFormatada;
        if (ag.data) {
          // Se ag.data já é uma string YYYY-MM-DD, parsear primeiro
          if (typeof ag.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ag.data)) {
            const parsed = parseISO(ag.data);
            dataFormatada = isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : ag.data;
          } else {
            // Tentar formatar diretamente
            const parsed = new Date(ag.data);
            dataFormatada = isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : 'Data inválida';
          }
        } else {
          dataFormatada = 'Sem data';
        }
        
        const congregacao = ag.congregacao_nome || 'Nossa Congregação';
        const discurso = `${ag.discurso_numero || 'N/A'} - ${ag.discurso_tema || 'N/A'}`;
        const orador = ag.orador_nome || 'N/A';
        const tipo = ag.tipo === 'local' ? 'Local' : 
                     ag.tipo === 'enviado' ? 'Enviar' : 'Receber';
        
        csv += `"${dataFormatada}","${congregacao}","${discurso}","${orador}","${tipo}"\n`;
      } catch (itemError) {
        console.error('Erro ao processar agendamento no CSV:', itemError, ag);
        // Continua com o próximo item mesmo se houver erro
      }
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=agendamentos.csv');
    res.send('\uFEFF' + csv); // BOM para UTF-8
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao exportar CSV', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.verificarSemanasVazias = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação de datas
    
    // Considerar sábados e domingos, semana iniciando na segunda e terminando no domingo
    // Cobrir 5 semanas completas: da segunda de início até o domingo da 5ª semana

    // Calcular a segunda-feira da semana atual
    const diaSemana = hoje.getDay(); // 0 = domingo ... 6 = sábado
    const diasDesdeSegunda = (diaSemana + 6) % 7; // desloca domingo para 6
    const primeiraSegunda = new Date(hoje);
    primeiraSegunda.setDate(hoje.getDate() - diasDesdeSegunda);
    primeiraSegunda.setHours(0, 0, 0, 0);

    // Se o domingo dessa semana já passou, começar na próxima segunda
    const primeiroDomingo = new Date(primeiraSegunda);
    primeiroDomingo.setDate(primeiraSegunda.getDate() + 6);
    let inicioSemanas = primeiraSegunda;
    if (primeiroDomingo < hoje) {
      inicioSemanas = addDays(primeiraSegunda, 7);
    }

    const fimPeriodo = addDays(addWeeks(inicioSemanas, 5), 6); // domingo da 5ª semana

    // Buscar semanas com agendamento válido (sábado ou domingo com tipo local/recebido)
    const semanasComAgendamento = await Agendamento.getSemanasVazias(
      format(inicioSemanas, 'yyyy-MM-dd'),
      format(fimPeriodo, 'yyyy-MM-dd')
    );

    const semanasAgendadas = new Set(
      semanasComAgendamento.map(s => format(new Date(s.semana), 'yyyy-MM-dd'))
    );

    // Gerar a lista de semanas (segundas-feiras) até dataFim
    const todasSegundas = [];
    for (let seg = new Date(inicioSemanas); seg <= fimPeriodo; seg = addWeeks(seg, 1)) {
      todasSegundas.push(new Date(seg));
    }

    // Encontrar semanas (segunda a domingo) sem agendamento em sábado ou domingo
    const semanasVazias = todasSegundas
      .filter(segunda => !semanasAgendadas.has(format(segunda, 'yyyy-MM-dd')))
      .map(segunda => {
        const domingo = addDays(segunda, 6);
        return {
          inicio: format(segunda, 'yyyy-MM-dd'),
          fim: format(domingo, 'yyyy-MM-dd'),
          aviso: `Nenhum discurso programado para a semana de ${format(segunda, 'dd/MM/yyyy')} a ${format(domingo, 'dd/MM/yyyy')}`
        };
      });
    
    res.json({ semanasVazias });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

