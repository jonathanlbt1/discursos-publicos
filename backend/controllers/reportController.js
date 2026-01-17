const PDFDocument = require('pdfkit');
const { format, parseISO, isValid } = require('date-fns');
const { ptBR } = require('date-fns/locale');
const Agendamento = require('../models/agendamento');
const Discurso = require('../models/discurso');
const Orador = require('../models/orador');
const Congregacao = require('../models/congregacao');
const pool = require('../config/database');

// Helper para formatar data/hora atual no timezone de Brasília (UTC-3)
function formatBrasiliaTime(formatStr) {
  const now = new Date();
  // Usar Intl.DateTimeFormat para obter os componentes da data/hora em Brasília
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const brasiliaDate = {
    year: parseInt(parts.find(p => p.type === 'year').value),
    month: parseInt(parts.find(p => p.type === 'month').value),
    day: parseInt(parts.find(p => p.type === 'day').value),
    hour: parseInt(parts.find(p => p.type === 'hour').value),
    minute: parseInt(parts.find(p => p.type === 'minute').value)
  };
  
  // Formatar manualmente no formato desejado: "dd/MM/yyyy 'às' HH:mm"
  const dia = String(brasiliaDate.day).padStart(2, '0');
  const mes = String(brasiliaDate.month).padStart(2, '0');
  const ano = brasiliaDate.year;
  const hora = String(brasiliaDate.hour).padStart(2, '0');
  const minuto = String(brasiliaDate.minute).padStart(2, '0');
  
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
}

// Helper para parsear datas de forma segura
function safeParseDate(dateValue) {
  if (!dateValue) return null;
  
  // Se já é um objeto Date válido
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  
  // Se é uma string, tenta parsear
  if (typeof dateValue === 'string') {
    // Se está no formato YYYY-MM-DD, parse como ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const parsed = parseISO(dateValue);
      return isValid(parsed) ? parsed : null;
    }
    
    // Se contém T (ISO format), tenta parseISO
    if (dateValue.includes('T')) {
      const parsed = parseISO(dateValue);
      return isValid(parsed) ? parsed : null;
    }
    
    // Tenta criar Date normalmente
    const parsed = new Date(dateValue);
    return isValid(parsed) ? parsed : null;
  }
  
  return null;
}

// Helper para formatar data de forma segura
function safeFormatDate(dateValue, formatStr, options = {}) {
  const date = safeParseDate(dateValue);
  if (!date) return 'Data inválida';
  return format(date, formatStr, options);
}

// Função auxiliar para adicionar cabeçalho
const addHeader = (doc, titulo) => {
  doc.fontSize(20)
     .fillColor('#667eea')
     .text('Programação de Discursos', { align: 'center' })
     .fontSize(16)
     .fillColor('#333')
     .text(titulo, { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .fillColor('#666')
     .text(`Gerado em: ${formatBrasiliaTime("dd/MM/yyyy 'às' HH:mm")}`, { align: 'center' })
     .moveDown(1.5);
};

// Função auxiliar para adicionar rodapé
const addFooter = (doc, pageNumber) => {
  doc.fontSize(8)
     .fillColor('#999')
     .text(
       `Página ${pageNumber} - Sistema de Discursos`,
       50,
       doc.page.height - 50,
       { align: 'center' }
     );
};

// Relatório de Agendamentos Futuros
exports.relatorioAgendamentosFuturos = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const filters = {};
    
    if (dataInicio) filters.dataInicio = dataInicio;
    if (dataFim) filters.dataFim = dataFim;

    const agendamentos = await Agendamento.getFuturos(filters);
    
    // Garantir que agendamentos é um array
    if (!Array.isArray(agendamentos)) {
      console.error('Erro: agendamentos não é um array:', typeof agendamentos, agendamentos);
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=agendamentos-futuros.pdf');
    
    doc.pipe(res);

    // Cabeçalho
    addHeader(doc, 'Relatório de Agendamentos Futuros');

    // Filtros aplicados
    if (dataInicio || dataFim) {
      doc.fontSize(10).fillColor('#666');
      if (dataInicio && dataFim) {
        doc.text(`Período: ${safeFormatDate(dataInicio, 'dd/MM/yyyy')} a ${safeFormatDate(dataFim, 'dd/MM/yyyy')}`);
      } else if (dataInicio) {
        doc.text(`A partir de: ${safeFormatDate(dataInicio, 'dd/MM/yyyy')}`);
      } else if (dataFim) {
        doc.text(`Até: ${safeFormatDate(dataFim, 'dd/MM/yyyy')}`);
      }
      doc.moveDown(1);
    }

    // Total de agendamentos
    doc.fontSize(12)
       .fillColor('#333')
       .text(`Total de Agendamentos: ${agendamentos.length}`, { underline: true })
       .moveDown(1);

    // Tabela de agendamentos
    agendamentos.forEach((ag, index) => {
      // Verificar se precisa de nova página
      if (doc.y > 700) {
        doc.addPage();
        addHeader(doc, 'Relatório de Agendamentos Futuros (continuação)');
      }

      doc.fontSize(11)
         .fillColor('#333')
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${safeFormatDate(ag.data, "dd/MM/yyyy - EEEE", { locale: ptBR })}`, { continued: false });

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#666')
         .text(`   Discurso: #${ag.discurso_numero} - ${ag.discurso_tema}`)
         .text(`   Orador: ${ag.orador_nome || 'Não definido'}`)
         .text(`   Tipo: ${ag.tipo === 'local' ? 'Local' : ag.tipo === 'enviado' ? 'Enviar' : 'Receber'}`);

      if (ag.congregacao_nome) {
        doc.text(`   Congregação: ${ag.congregacao_nome}`);
      }

      if (ag.observacoes) {
        doc.text(`   Observações: ${ag.observacoes}`);
      }

      doc.moveDown(0.8);
      
      // Linha separadora
      doc.strokeColor('#e0e0e0')
         .lineWidth(0.5)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown(0.8);
    });

    if (agendamentos.length === 0) {
      doc.fontSize(12)
         .fillColor('#999')
         .text('Nenhum agendamento encontrado para o período selecionado.', { align: 'center' });
    }

    // Rodapé
    addFooter(doc, 1);

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatório de agendamentos futuros:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada (PDF começou a ser gerado), não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, tentar finalizar de forma segura
      console.error('Erro durante geração do PDF - resposta já iniciada');
      try {
        // Tentar fechar o stream de forma segura
        if (res && !res.finished) {
          res.end();
        }
      } catch (finalError) {
        console.error('Erro ao finalizar resposta:', finalError);
      }
    }
  }
};

// Relatório de Histórico de Discursos
exports.relatorioHistoricoDiscursos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.numero,
        d.tema,
        COUNT(hd.id) as total_vezes,
        MAX(hd.data) as ultima_data,
        MIN(hd.data) as primeira_data,
        STRING_AGG(
          TO_CHAR(hd.data, 'DD/MM/YYYY') || ' - ' || 
          COALESCE(o.nome, 'N/A') || ' (' || 
          CASE 
            WHEN hd.tipo = 'local' THEN 'Local'
            WHEN hd.tipo = 'enviado' THEN 'Enviar'
            ELSE 'Recebido'
          END || ')',
          chr(10)
          ORDER BY hd.data DESC
        ) as historico
      FROM discursos d
      LEFT JOIN historico_discursos hd ON d.id = hd.discurso_id
      LEFT JOIN oradores o ON hd.orador_id = o.id
      GROUP BY d.id, d.numero, d.tema
      HAVING COUNT(hd.id) > 0
      ORDER BY d.numero
    `);

    const discursos = result.rows;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=historico-discursos.pdf');
    
    doc.pipe(res);

    // Cabeçalho
    addHeader(doc, 'Histórico Completo de Discursos');

    doc.fontSize(12)
       .fillColor('#333')
       .text(`Total de Discursos Proferidos: ${discursos.length}`, { underline: true })
       .moveDown(1);

    // Discursos
    discursos.forEach((d, index) => {
      if (doc.y > 650) {
        doc.addPage();
        addHeader(doc, 'Histórico Completo de Discursos (continuação)');
      }

      doc.fontSize(11)
         .fillColor('#667eea')
         .font('Helvetica-Bold')
         .text(`#${d.numero} - ${d.tema}`);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#666')
         .text(`   Proferido ${d.total_vezes} vez(es)`)
         .text(`   Primeira vez: ${safeFormatDate(d.primeira_data, 'dd/MM/yyyy')}`)
         .text(`   Última vez: ${safeFormatDate(d.ultima_data, 'dd/MM/yyyy')}`)
         .moveDown(0.5);

      // Histórico detalhado
      if (d.historico) {
        doc.fontSize(8)
           .fillColor('#999')
           .text('   Histórico:', { continued: false });
        
        const linhas = d.historico.split('\n');
        linhas.slice(0, 10).forEach(linha => { // Limite de 10 para evitar poluição
          doc.text(`   • ${linha}`, { indent: 20 });
        });

        if (linhas.length > 10) {
          doc.text(`   ... e mais ${linhas.length - 10} registro(s)`, { indent: 20 });
        }
      }

      doc.moveDown(0.5);
      doc.strokeColor('#e0e0e0')
         .lineWidth(0.5)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown(0.5);
    });

    if (discursos.length === 0) {
      doc.fontSize(12)
         .fillColor('#999')
         .text('Nenhum discurso foi proferido ainda.', { align: 'center' });
    }

    addFooter(doc, 1);
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatório de histórico de discursos:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada, não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, tentar finalizar de forma segura
      console.error('Erro durante geração do PDF - resposta já iniciada');
      try {
        if (res && !res.finished) {
          res.end();
        }
      } catch (finalError) {
        console.error('Erro ao finalizar resposta:', finalError);
      }
    }
  }
};

// Relatório de Oradores
exports.relatorioOradores = async (req, res) => {
  try {
    const result = await Orador.getAll();
    const oradores = result.items || [];
    
    // Garantir que oradores é um array
    if (!Array.isArray(oradores)) {
      console.error('Erro: oradores não é um array:', typeof oradores, oradores);
      return res.status(500).json({ error: 'Erro ao buscar oradores' });
    }
    
    // Buscar histórico de cada orador
    const oradoresComHistorico = await Promise.all(
      oradores.map(async (o) => {
        const historico = await Orador.getHistorico(o.id);
        return { ...o, historico };
      })
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-oradores.pdf');
    
    doc.pipe(res);

    // Cabeçalho
    addHeader(doc, 'Relatório de Oradores');

    const oradoresAtivos = oradoresComHistorico.filter(o => o.ativo).length;
    doc.fontSize(10)
       .fillColor('#333')
       .text(`Total de Oradores: ${oradores.length}`, { underline: false })
       .text(`Oradores Ativos: ${oradoresAtivos}`)
       .text(`Oradores Inativos: ${oradores.length - oradoresAtivos}`)
       .moveDown(1.5);

    // Listar oradores
    oradoresComHistorico.forEach((o, index) => {
      if (doc.y > 680) {
        doc.addPage();
        addHeader(doc, 'Relatório de Oradores (continuação)');
      }

      doc.fontSize(12)
         .fillColor('#333')
         .font('Helvetica-Bold')
         .text(`${o.nome} ${o.ativo ? '✓' : '✗'}`, { continued: false });

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#666');

      if (o.celular) doc.text(`   Celular: ${o.celular}`);
      if (o.email) doc.text(`   E-mail: ${o.email}`);
      
      doc.text(`   Status: ${o.ativo ? 'Ativo' : 'Inativo'}`)
         .text(`   Discursos Enviados: ${o.historico.length}`)
         .moveDown(0.5);

      // Últimos discursos
      if (o.historico.length > 0) {
        doc.fontSize(8)
           .fillColor('#999')
           .text('   Últimos Discursos Enviados:');

        o.historico.slice(0, 5).forEach(h => {
          doc.text(`   • ${safeFormatDate(h.data, 'dd/MM/yyyy')} - #${h.numero} ${h.tema} (${h.congregacao_nome || 'N/A'})`);
        });

        if (o.historico.length > 5) {
          doc.text(`   ... e mais ${o.historico.length - 5} discurso(s)`);
        }
      }

      doc.moveDown(0.5);
      doc.strokeColor('#e0e0e0')
         .lineWidth(0.5)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown(0.8);
    });

    addFooter(doc, 1);
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatório de oradores:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada, não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, tentar finalizar de forma segura
      console.error('Erro durante geração do PDF - resposta já iniciada');
      try {
        if (res && !res.finished) {
          res.end();
        }
      } catch (finalError) {
        console.error('Erro ao finalizar resposta:', finalError);
      }
    }
  }
};

// Relatório de Programação Mensal
exports.relatorioProgramacaoMensal = async (req, res) => {
  try {
    const { mes, ano, tipo } = req.query;
    
    console.log('Relatório Programação Mensal - Parâmetros recebidos:', { mes, ano, tipo });
    
    if (!mes || !ano) {
      console.error('Erro: Mês ou ano não fornecido');
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    const dataInicio = `${ano}-${mes.padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, parseInt(mes), 0).getDate();
    const dataFim = `${ano}-${mes.padStart(2, '0')}-${ultimoDia}`;

    console.log('Buscando agendamentos entre:', dataInicio, 'e', dataFim, tipo ? `tipos: ${tipo}` : '');
    
    const filters = { dataInicio, dataFim };
    
    // Processar múltiplos tipos (pode vir como string separada por vírgula ou array)
    if (tipo) {
      let tiposArray = [];
      if (Array.isArray(tipo)) {
        tiposArray = tipo;
      } else if (typeof tipo === 'string') {
        // Se for string, pode ser separada por vírgula
        tiposArray = tipo.split(',').map(t => t.trim()).filter(t => t);
      }
      
      // Validar tipos e filtrar apenas os válidos
      const tiposValidos = ['local', 'enviado', 'recebido'];
      tiposArray = tiposArray.filter(t => tiposValidos.includes(t));
      
      if (tiposArray.length > 0) {
        filters.tipos = tiposArray; // Usar 'tipos' (plural) para indicar array
      }
    }
    
    const result = await Agendamento.getAll(filters);
    const agendamentos = result.items || [];
    
    console.log('Agendamentos encontrados:', agendamentos.length);

    console.log('Criando documento PDF...');
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Configurar headers antes de começar a escrever
    res.setHeader('Content-Type', 'application/pdf');
    let filename = `programacao-${mes}-${ano}`;
    if (filters.tipos && filters.tipos.length > 0 && filters.tipos.length < 3) {
      filename += `-${filters.tipos.join('-')}`;
    }
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
    
    console.log('Headers configurados, iniciando pipe...');
    
    doc.pipe(res);

    // Cabeçalho
    const nomeMes = format(new Date(ano, parseInt(mes) - 1, 1), 'MMMM yyyy', { locale: ptBR });
    let tituloRelatorio = `Programação de Discursos - ${nomeMes}`;
    if (filters.tipos && filters.tipos.length > 0) {
      const tipoLabels = filters.tipos.map(t => 
        t === 'local' ? 'Local' : t === 'enviado' ? 'Enviar' : 'Receber'
      );
      tituloRelatorio += ` (${tipoLabels.join(', ')})`;
    }
    addHeader(doc, tituloRelatorio);

    // Estatísticas
    const locais = agendamentos.filter(a => a.tipo === 'local').length;
    const enviados = agendamentos.filter(a => a.tipo === 'enviado').length;
    const recebidos = agendamentos.filter(a => a.tipo === 'recebido').length;

    doc.fontSize(10)
       .fillColor('#333')
       .text(`Total de Agendamentos: ${agendamentos.length}`);
    
    // Mostrar estatísticas apenas se não houver filtro de tipo aplicado ou se todos os tipos estiverem selecionados
    const tiposFiltrados = filters.tipos || [];
    if (tiposFiltrados.length === 0 || tiposFiltrados.length === 3) {
      doc.text(`  • Discursos Locais: ${locais}`)
         .text(`  • Oradores Enviados: ${enviados}`)
         .text(`  • Oradores Recebidos: ${recebidos}`);
    }
    
    doc.moveDown(1.5);

    // Agendamentos por semana
    doc.fontSize(14)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text('Programação Detalhada')
       .moveDown(1);

    agendamentos.forEach((ag, index) => {
      try {
        if (doc.y > 700) {
          doc.addPage();
          let tituloContinuacao = `Programação de Discursos - ${nomeMes}`;
          if (filters.tipos && filters.tipos.length > 0) {
            const tipoLabels = filters.tipos.map(t => 
              t === 'local' ? 'Local' : t === 'enviado' ? 'Enviar' : 'Receber'
            );
            tituloContinuacao += ` (${tipoLabels.join(', ')})`;
          }
          tituloContinuacao += ' (continuação)';
          addHeader(doc, tituloContinuacao);
        }

        const dataFormatada = safeFormatDate(ag.data, "dd/MM/yyyy - EEEE", { locale: ptBR });
        
        doc.fontSize(13)
           .fillColor('#333')
           .font('Helvetica-Bold')
           .text(dataFormatada, { underline: true });

        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#666')
           .text(`Discurso: #${ag.discurso_numero} - ${ag.discurso_tema}`, { indent: 20 })
           .text(`Orador: ${ag.orador_nome || 'Não definido'}`, { indent: 20 });

        const tipoLabel = ag.tipo === 'local' ? 'Local (Nossa Congregação)' : 
                          ag.tipo === 'enviado' ? `Enviar para ${ag.congregacao_nome}` : 
                          `Receber de ${ag.congregacao_nome}`;
        
        doc.fillColor(ag.tipo === 'local' ? '#1976d2' : ag.tipo === 'enviado' ? '#7b1fa2' : '#388e3c')
           .text(`Tipo: ${tipoLabel}`, { indent: 20 });

        if (ag.observacoes) {
          doc.fillColor('#999')
             .fontSize(12)
             .text(`Observações: ${ag.observacoes}`, { indent: 20 });
        }

        doc.moveDown(1);
      } catch (error) {
        console.error(`Erro ao processar agendamento ${index}:`, error);
        // Continua com o próximo agendamento mesmo se houver erro
      }
    });

    if (agendamentos.length === 0) {
      doc.fontSize(12)
         .fillColor('#999')
         .text(`Nenhum agendamento para ${nomeMes}.`, { align: 'center' });
    }

    console.log('Finalizando PDF...');
    
    doc.end();
    
    console.log('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar relatório de programação mensal:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada, não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, finaliza o documento com erro
      console.error('Erro durante geração do PDF - resposta já iniciada');
      // Tenta adicionar uma página de erro
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);
        doc.fontSize(16)
           .fillColor('#dc3545')
           .text('Erro ao gerar relatório', { align: 'center' })
           .moveDown(1)
           .fontSize(12)
           .fillColor('#333')
           .text(`Erro: ${error.message}`, { align: 'center' });
        doc.end();
      } catch (finalError) {
        console.error('Erro ao gerar página de erro:', finalError);
      }
    }
  }
};

// Relatório Estatístico
exports.relatorioEstatisticas = async (req, res) => {
  try {
    // Buscar estatísticas
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM discursos) as total_discursos,
        (SELECT COUNT(*) FROM oradores WHERE ativo = true) as oradores_ativos,
        (SELECT COUNT(*) FROM congregacoes) as total_congregacoes,
        (SELECT COUNT(*) FROM agendamentos WHERE data >= CURRENT_DATE) as agendamentos_futuros,
        (SELECT COUNT(*) FROM historico_discursos) as discursos_realizados,
        (SELECT COUNT(DISTINCT discurso_id) FROM historico_discursos) as discursos_ja_proferidos
    `);

    const estatisticas = stats.rows[0];

    // Top 10 discursos mais proferidos
    const topDiscursos = await pool.query(`
      SELECT 
        d.numero,
        d.tema,
        COUNT(hd.id) as vezes,
        MAX(hd.data) as ultima_data
      FROM discursos d
      JOIN historico_discursos hd ON d.id = hd.discurso_id
      GROUP BY d.id, d.numero, d.tema
      ORDER BY vezes DESC, d.numero
      LIMIT 10
    `);

    // Top 10 oradores mais ativos
    const topOradores = await pool.query(`
      SELECT 
        o.nome,
        COUNT(hd.id) as total_discursos,
        MAX(hd.data) as ultimo_discurso
      FROM oradores o
      JOIN historico_discursos hd ON o.id = hd.orador_id
      WHERE hd.tipo = 'enviado'
      GROUP BY o.id, o.nome
      ORDER BY total_discursos DESC, o.nome
      LIMIT 10
    `);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-estatisticas.pdf');
    
    doc.pipe(res);

    // Cabeçalho
    addHeader(doc, 'Relatório Estatístico');

    // Estatísticas Gerais
    doc.fontSize(14)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text('Estatísticas Gerais')
       .moveDown(1);

    doc.fontSize(10)
       .fillColor('#333')
       .font('Helvetica')
       .text(`Total de Discursos Cadastrados: ${estatisticas.total_discursos}`)
       .text(`Discursos Já Proferidos: ${estatisticas.discursos_ja_proferidos}`)
       .text(`Total de Discursos Realizados: ${estatisticas.discursos_realizados}`)
       .text(`Oradores Ativos: ${estatisticas.oradores_ativos}`)
       .text(`Congregações Parceiras: ${estatisticas.total_congregacoes}`)
       .text(`Agendamentos Futuros: ${estatisticas.agendamentos_futuros}`)
       .moveDown(2);

    // Top 10 Discursos
    doc.fontSize(14)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text('Top 10 Discursos Mais Proferidos')
       .moveDown(1);

    if (topDiscursos.rows.length > 0) {
      topDiscursos.rows.forEach((d, index) => {
        doc.fontSize(10)
           .fillColor('#333')
           .font('Helvetica-Bold')
           .text(`${index + 1}. Discurso #${d.numero}`, { continued: true })
           .font('Helvetica')
           .text(` - ${d.vezes} vez(es)`);
        
        doc.fontSize(9)
           .fillColor('#666')
           .text(`   ${d.tema}`, { indent: 20 })
           .text(`   Última vez: ${safeFormatDate(d.ultima_data, 'dd/MM/yyyy')}`, { indent: 20 })
           .moveDown(0.5);
      });
    } else {
      doc.fontSize(10)
         .fillColor('#999')
         .text('Nenhum discurso proferido ainda.');
    }

    doc.moveDown(1);

    // Top 10 Oradores
    if (doc.y > 600) {
      doc.addPage();
      addHeader(doc, 'Relatório Estatístico (continuação)');
    }

    doc.fontSize(14)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text('Top 10 Oradores Mais Ativos')
       .moveDown(1);

    if (topOradores.rows.length > 0) {
      topOradores.rows.forEach((o, index) => {
        doc.fontSize(10)
           .fillColor('#333')
           .font('Helvetica-Bold')
           .text(`${index + 1}. ${o.nome}`, { continued: true })
           .font('Helvetica')
           .text(` - ${o.total_discursos} discurso(s) enviado(s)`);
        
        doc.fontSize(9)
           .fillColor('#666')
           .text(`   Último discurso: ${safeFormatDate(o.ultimo_discurso, 'dd/MM/yyyy')}`, { indent: 20 })
           .moveDown(0.5);
      });
    } else {
      doc.fontSize(10)
         .fillColor('#999')
         .text('Nenhum orador enviado ainda.');
    }

    addFooter(doc, 1);
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatório estatístico:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada, não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, tentar finalizar de forma segura
      console.error('Erro durante geração do PDF - resposta já iniciada');
      try {
        if (res && !res.finished) {
          res.end();
        }
      } catch (finalError) {
        console.error('Erro ao finalizar resposta:', finalError);
      }
    }
  }
};

// Relatório de Discursos Disponíveis (não proferidos recentemente)
exports.relatorioDiscursosDisponiveis = async (req, res) => {
  try {
    const result = await Discurso.getAll();
    const discursos = result.items || [];
    
    // Garantir que discursos é um array
    if (!Array.isArray(discursos)) {
      console.error('Erro: discursos não é um array:', typeof discursos, discursos);
      return res.status(500).json({ error: 'Erro ao buscar discursos' });
    }
    
    const disponibilidade = await Promise.all(
      discursos.map(async (d) => {
        const ultimaData = await Discurso.getUltimaDataLocal(d.id);
        
        let status = 'disponivel';
        let meses = null;
        
        if (ultimaData) {
          const hoje = new Date();
          const ultima = new Date(ultimaData);
          meses = Math.floor((hoje - ultima) / (1000 * 60 * 60 * 24 * 30));
          
          if (meses <= 6) {
            status = 'indisponivel';
          } else if (meses <= 12) {
            status = 'atencao';
          }
        }
        
        return { ...d, ultimaData, meses, status };
      })
    );

    const disponiveis = disponibilidade.filter(d => d.status === 'disponivel');
    const atencao = disponibilidade.filter(d => d.status === 'atencao');
    const indisponiveis = disponibilidade.filter(d => d.status === 'indisponivel');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=discursos-disponiveis.pdf');
    
    doc.pipe(res);

    // Cabeçalho
    addHeader(doc, 'Relatório de Disponibilidade de Discursos');

    // Resumo
    doc.fontSize(10)
       .fillColor('#333')
       .text(`Total de Discursos: ${discursos.length}`)
       .fillColor('#28a745')
       .text(`✓ Disponíveis (>12 meses ou nunca proferidos): ${disponiveis.length}`)
       .fillColor('#ffc107')
       .text(`⚠ Atenção (6-12 meses): ${atencao.length}`)
       .fillColor('#dc3545')
       .text(`✗ Indisponíveis (<6 meses): ${indisponiveis.length}`)
       .moveDown(2);

    // Discursos Disponíveis
    if (disponiveis.length > 0) {
      doc.fontSize(12)
         .fillColor('#28a745')
         .font('Helvetica-Bold')
         .text('✓ Discursos Disponíveis')
         .moveDown(0.5);

      disponiveis.forEach(d => {
        if (doc.y > 720) {
          doc.addPage();
          addHeader(doc, 'Discursos Disponíveis (continuação)');
        }

        doc.fontSize(9)
           .fillColor('#333')
           .font('Helvetica')
           .text(`#${d.numero} - ${d.tema}`, { indent: 10 });
        
        if (d.ultimaData) {
          doc.fillColor('#666')
             .text(`  Última vez: ${safeFormatDate(d.ultimaData, 'dd/MM/yyyy')} (há ${d.meses} meses)`, { indent: 10 });
        } else {
          doc.fillColor('#28a745')
             .text(`  Nunca foi proferido`, { indent: 10 });
        }
        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Discursos com Atenção
    if (atencao.length > 0) {
      if (doc.y > 650) {
        doc.addPage();
        addHeader(doc, 'Relatório de Disponibilidade (continuação)');
      }

      doc.fontSize(12)
         .fillColor('#ffc107')
         .font('Helvetica-Bold')
         .text('⚠ Discursos com Atenção (6-12 meses)')
         .moveDown(0.5);

      atencao.forEach(d => {
        if (doc.y > 720) {
          doc.addPage();
        }

        doc.fontSize(9)
           .fillColor('#333')
           .font('Helvetica')
           .text(`#${d.numero} - ${d.tema}`, { indent: 10 })
           .fillColor('#856404')
           .text(`  Última vez: ${safeFormatDate(d.ultimaData, 'dd/MM/yyyy')} (há ${d.meses} meses)`, { indent: 10 })
           .moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Discursos Indisponíveis
    if (indisponiveis.length > 0) {
      if (doc.y > 650) {
        doc.addPage();
        addHeader(doc, 'Relatório de Disponibilidade (continuação)');
      }

      doc.fontSize(12)
         .fillColor('#dc3545')
         .font('Helvetica-Bold')
         .text('✗ Discursos Indisponíveis (<6 meses)')
         .moveDown(0.5);

      indisponiveis.forEach(d => {
        if (doc.y > 720) {
          doc.addPage();
        }

        doc.fontSize(9)
           .fillColor('#333')
           .font('Helvetica')
           .text(`#${d.numero} - ${d.tema}`, { indent: 10 })
           .fillColor('#721c24')
           .text(`  Última vez: ${safeFormatDate(d.ultimaData, 'dd/MM/yyyy')} (há ${d.meses} meses)`, { indent: 10 })
           .moveDown(0.3);
      });
    }

    addFooter(doc, 1);
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatório de discursos disponíveis:', error);
    console.error('Stack trace:', error.stack);
    
    // Se a resposta já foi iniciada, não podemos enviar JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar relatório', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      // Se já começou a gerar o PDF, tentar finalizar de forma segura
      console.error('Erro durante geração do PDF - resposta já iniciada');
      try {
        if (res && !res.finished) {
          res.end();
        }
      } catch (finalError) {
        console.error('Erro ao finalizar resposta:', finalError);
      }
    }
  }
};

// Relatório: Oradores da congregação Jardim Santista com discursos atrelados em agendamentos
exports.relatorioOradoresJardimSantista = async (req, res) => {
  try {
    // Encontrar congregação por nome (case-insensitive)
    const cg = await pool.query('SELECT id, nome FROM congregacoes WHERE nome ILIKE $1 LIMIT 1', ['Jardim Santista']);
    if (cg.rowCount === 0) {
      return res.status(404).json({ error: 'Congregação "Jardim Santista" não encontrada' });
    }
    const congregacao = cg.rows[0];

    const query = `
      SELECT o.id AS orador_id, o.nome AS orador_nome,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'agendamento_id', a.id,
          'discurso_id', d.id,
          'numero', d.numero,
          'tema', d.tema,
          'data', TO_CHAR(a.data, 'YYYY-MM-DD'),
          'tipo', a.tipo
        ) ORDER BY a.data DESC) FILTER (WHERE a.id IS NOT NULL), '[]') AS discursos
      FROM oradores o
      LEFT JOIN agendamentos a ON a.orador_id = o.id
      LEFT JOIN discursos d ON a.discurso_id = d.id
      WHERE o.congregacao_id = $1
      GROUP BY o.id, o.nome
      ORDER BY o.nome
    `;

    const result = await pool.query(query, [congregacao.id]);

    return res.json({ congregacao, items: result.rows });
  } catch (error) {
    console.error('Erro ao gerar relatório oradores-jardim-santista:', error);
    return res.status(500).json({ error: 'Erro interno', details: error.message });
  }
};

// Relatório: Oradores por congregação (PDF)
exports.relatorioOradoresPorCongregacao = async (req, res) => {
  try {
    const congregacaoId = req.query.congregacao_id || req.query.congregacaoId || req.query.id;
    if (!congregacaoId) {
      return res.status(400).json({ error: 'Parâmetro congregacao_id é obrigatório' });
    }

    // Verificar congregação
    const cg = await pool.query('SELECT id, nome FROM congregacoes WHERE id = $1 LIMIT 1', [congregacaoId]);
    if (cg.rowCount === 0) {
      return res.status(404).json({ error: 'Congregação não encontrada' });
    }
    const congregacao = cg.rows[0];

    // Buscar oradores selecionados (se fornecido) ou todos da congregação
    let oradoresIds = [];
    if (req.query.oradores_ids) {
      // Parse da lista de IDs separados por vírgula
      oradoresIds = req.query.oradores_ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    }

    let oradoresQuery = 'SELECT id, nome, esbocos FROM oradores WHERE congregacao_id = $1 AND ativo = true';
    let oradoresParams = [congregacao.id];
    
    if (oradoresIds.length > 0) {
      // Filtrar apenas os oradores selecionados (que também devem ser ativos)
      const placeholders = oradoresIds.map((_, index) => `$${index + 2}`).join(', ');
      oradoresQuery += ` AND id IN (${placeholders})`;
      oradoresParams = [congregacao.id, ...oradoresIds];
    }
    
    oradoresQuery += ' ORDER BY nome';
    
    const oradoresRes = await pool.query(oradoresQuery, oradoresParams);
    const oradores = oradoresRes.rows;

    // Para cada orador, buscar discursos baseados nos números de esboços da coluna esbocos
    const oradoresComDiscursos = [];
    for (const o of oradores) {
      const discursos = [];
      
      // Se o orador tem esboços cadastrados, buscar os discursos correspondentes
      if (o.esbocos && o.esbocos.trim() !== '') {
        // Parse dos números de esboços (formato: "4, 16, 24, 30" ou "07, 12, 41")
        // Suporta tanto vírgula quanto ponto e vírgula como separador
        const separador = o.esbocos.includes(',') ? ',' : ';';
        const numerosEsbocos = o.esbocos
          .split(separador)
          .map(num => num.trim())
          .filter(num => num !== '')
          .map(num => {
            // Remover zeros à esquerda se houver (ex: "07" -> "7")
            const parsed = parseInt(num, 10);
            return isNaN(parsed) ? null : parsed;
          })
          .filter(num => num !== null);

        // Remover duplicatas mantendo a ordem
        const numerosUnicos = [...new Set(numerosEsbocos)];

        if (numerosUnicos.length > 0) {
          // Buscar discursos correspondentes aos números de esboços
          // Usar placeholders dinâmicos para garantir que todos os números sejam buscados
          const placeholders = numerosUnicos.map((_, index) => `$${index + 1}`).join(', ');
          const discursosQuery = `
            SELECT id, numero, tema
            FROM discursos
            WHERE numero IN (${placeholders})
            ORDER BY numero
          `;

          // Executar query com todos os números como parâmetros
          const discursosRes = await pool.query(discursosQuery, numerosUnicos);
          
          // Garantir que todos os resultados sejam adicionados
          if (discursosRes && discursosRes.rows && discursosRes.rows.length > 0) {
            // Adicionar todos os discursos encontrados
            for (const row of discursosRes.rows) {
              discursos.push({
                numero: row.numero,
                tema: row.tema
              });
            }
          }
        }
      }
      
      oradoresComDiscursos.push({ orador: o, discursos: discursos });
    }

    // Gerar PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = (congregacao.nome || 'congregacao').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=oradores-${safeName}.pdf`);
    doc.pipe(res);

    addHeader(doc, `Oradores Disponíveis da Congregação ${congregacao.nome}`);

    if (oradoresComDiscursos.length === 0) {
      doc.fontSize(12).fillColor('#999').text('Nenhum orador selecionado ou cadastrado para esta congregação.', { align: 'center' });
      addFooter(doc, 1);
      doc.end();
      return;
    }

    for (const item of oradoresComDiscursos) {
      try {
        if (doc.y > 700) {
          doc.addPage();
          addHeader(doc, `Oradores Disponíveis da Congregação ${congregacao.nome} (continuação)`);
        }

        doc.fontSize(12).fillColor('#333').font('Helvetica-Bold').text(item.orador.nome);
        doc.font('Helvetica').fontSize(10).fillColor('#666');

        if (!item.discursos || item.discursos.length === 0) {
          doc.text('   • Nenhum discurso relacionado.');
        } else {
          item.discursos.forEach((discurso) => {
            // Mostrar apenas número e nome do esboço (sem data e tipo)
            const numero = discurso.numero || 'N/A';
            const tema = discurso.tema || 'Sem tema';
            doc.text(`   • ${numero} — ${tema}`);
          });
        }

        doc.moveDown(0.5);
        doc.strokeColor('#e0e0e0').lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
      } catch (err) {
        console.error('Erro ao adicionar orador ao PDF:', err);
      }
    }

    addFooter(doc, 1);
    doc.end();
  } catch (error) {
    console.error('Erro ao gerar relatorioOradoresPorCongregacao:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao gerar relatório', details: error.message });
    }
  }
};

// Carta Convite para Agendamento
exports.cartaConvite = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID do agendamento é obrigatório' });
    }

    // Buscar agendamento com dados completos
    const agendamento = await Agendamento.getById(id);
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Verificar se o tipo permite gerar carta convite
    if (agendamento.tipo !== 'local' && agendamento.tipo !== 'enviado') {
      return res.status(400).json({ error: 'Carta convite só pode ser gerada para agendamentos do tipo Local ou Enviar' });
    }

    // Buscar dados completos da congregação
    let congregacao = null;
    if (agendamento.congregacao_id) {
      congregacao = await Congregacao.getById(agendamento.congregacao_id);
    }

    // Se não tiver congregação e for tipo local, buscar Jardim Santista
    if (!congregacao && agendamento.tipo === 'local') {
      const jardimResult = await pool.query(
        "SELECT * FROM congregacoes WHERE nome ILIKE '%jardim santista%' LIMIT 1"
      );
      if (jardimResult.rows.length > 0) {
        congregacao = jardimResult.rows[0];
      }
    }

    // Validar dados necessários
    if (!agendamento.orador_nome) {
      return res.status(400).json({ error: 'Orador não definido para este agendamento' });
    }

    if (!agendamento.discurso_numero || !agendamento.discurso_tema) {
      return res.status(400).json({ error: 'Discurso não definido para este agendamento' });
    }

    if (!congregacao) {
      return res.status(400).json({ error: 'Congregação não encontrada' });
    }

    // Criar PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    const safeNomeOrador = (agendamento.orador_nome || 'orador').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename=carta-convite-${safeNomeOrador}.pdf`);
    
    doc.pipe(res);

    // Título
    doc.fontSize(18)
       .fillColor('#333')
       .font('Helvetica-Bold')
       .text('Aviso de Designação', { align: 'center' })
       .moveDown(2);

    // Corpo da carta
    doc.fontSize(12)
       .fillColor('#333')
       .font('Helvetica')
       .text(`Querido irmão ${agendamento.orador_nome}, espero que esteja bem!`, { align: 'left' })
       .moveDown(1);

    // Construir texto do convite
    const dataFormatada = safeFormatDate(agendamento.data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const diaSemana = safeFormatDate(agendamento.data, "EEEE", { locale: ptBR });
    const dataCompleta = `${diaSemana}, ${dataFormatada}`;
    
    const textoConvite = `O irmão está sendo convidado para proferir o discurso #${agendamento.discurso_numero} - ${agendamento.discurso_tema}, na congregação ${congregacao.nome}, localizada no endereço ${congregacao.endereco || 'endereço não informado'} no ${dataCompleta}, as ${congregacao.horario || 'horário não informado'} horas.`;

    doc.text(textoConvite, { align: 'left' })
       .moveDown(1);

    // Informações de contato
    if (congregacao.nome_contato || congregacao.celular_contato) {
      let contatoTexto = 'Se precisar de mais informações, poderá entrar em contato';
      if (congregacao.nome_contato && congregacao.celular_contato) {
        contatoTexto += ` com o irmão ${congregacao.nome_contato} (${congregacao.celular_contato}).`;
      } else if (congregacao.nome_contato) {
        contatoTexto += ` com o irmão ${congregacao.nome_contato}.`;
      } else if (congregacao.celular_contato) {
        contatoTexto += ` pelo telefone ${congregacao.celular_contato}.`;
      } else {
        contatoTexto += '.';
      }
      doc.text(contatoTexto, { align: 'left' })
         .moveDown(1);
    } else {
      doc.text('Se precisar de mais informações, poderá entrar em contato com a congregação.', { align: 'left' })
         .moveDown(1);
    }

    // Mensagem final
    doc.text('Se não puder cumprir com a designação, peço para que possa comunicar o irmão Jonathan Moraes, imediatamente.', { align: 'left' })
       .moveDown(1);

    doc.text('Que Jeová continue abençoando seus esforços!', { align: 'left' })
       .moveDown(2);

    // Assinatura (opcional - espaço para assinatura)
    doc.fontSize(10)
       .fillColor('#666')
       .text('_________________________', { align: 'left' })
       .text('Atenciosamente,', { align: 'left' })

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar carta convite:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro ao gerar carta convite', 
        details: error.message 
      });
    }
  }
};

