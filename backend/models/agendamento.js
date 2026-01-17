const pool = require('../config/database');

// Helper to normalize fields that should be integers but may arrive as empty strings
function parseNullableInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

// Helper to normalize date strings - garante que a data seja tratada como string YYYY-MM-DD
// Evita problemas de timezone ao converter para Date e depois para string
function normalizeDate(dateValue) {
  if (!dateValue) return null;
  
  // Se já é uma string no formato YYYY-MM-DD, retorna diretamente
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Se é um objeto Date, extrai apenas a parte da data local (sem timezone)
  // IMPORTANTE: usar getUTCFullYear, getUTCMonth, getUTCDate quando a data vem do PostgreSQL
  // porque o driver pg retorna Date objects que representam UTC midnight para colunas DATE
  if (dateValue instanceof Date) {
    // Verifica se é uma data que representa apenas data (sem hora)
    // Se a hora é 00:00:00 UTC, pode ser uma data DATE do PostgreSQL
    const isUTCMidnight = dateValue.getUTCHours() === 0 && 
                         dateValue.getUTCMinutes() === 0 && 
                         dateValue.getUTCSeconds() === 0 &&
                         dateValue.getUTCMilliseconds() === 0;
    
    if (isUTCMidnight) {
      // Usa UTC para extrair a data correta (PostgreSQL DATE é armazenado como UTC midnight)
      const year = dateValue.getUTCFullYear();
      const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Se tem hora, usa métodos locais
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  // Se é uma string ISO (com time), extrai apenas a parte da data
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  
  // Caso contrário, tenta converter para string
  return String(dateValue);
}

// Helper para normalizar um resultado do banco (normaliza a coluna 'data')
function normalizeResult(row) {
  if (!row) return row;
  if (row.data) {
    row.data = normalizeDate(row.data);
  }
  return row;
}

// Helper para normalizar um array de resultados
function normalizeResults(rows) {
  if (!Array.isArray(rows)) return rows;
  return rows.map(normalizeResult);
}

class Agendamento {
  static async getAll(filters = {}, options = {}) {
    const { busca, tipo, tipos, dataInicio, dataFim, congregacao_id } = filters;
    let query = `SELECT a.*, 
              d.numero as discurso_numero, 
              d.tema as discurso_tema,
              o.nome as orador_nome,
              c.nome as congregacao_nome
       FROM agendamentos a
       LEFT JOIN discursos d ON a.discurso_id = d.id
       LEFT JOIN oradores o ON a.orador_id = o.id
       LEFT JOIN congregacoes c ON a.congregacao_id = c.id`;
    
    const params = [];
    const conditions = [];

    if (busca) {
      conditions.push(`(
        CAST(d.numero AS TEXT) ILIKE $${params.length + 1} OR 
        d.tema ILIKE $${params.length + 1} OR 
        o.nome ILIKE $${params.length + 1} OR 
        c.nome ILIKE $${params.length + 1}
      )`);
      params.push(`%${busca}%`);
    }

    // Suporte para filtro por tipo único (retrocompatibilidade) ou múltiplos tipos
    if (tipos && Array.isArray(tipos) && tipos.length > 0) {
      // Múltiplos tipos usando IN
      const placeholders = tipos.map((_, index) => `$${params.length + index + 1}`).join(', ');
      conditions.push(`a.tipo IN (${placeholders})`);
      params.push(...tipos);
    } else if (tipo) {
      // Tipo único (retrocompatibilidade)
      conditions.push(`a.tipo = $${params.length + 1}`);
      params.push(tipo);
    }

    if (congregacao_id !== undefined && congregacao_id !== null && congregacao_id !== '') {
      // Converter para número se for string
      const congregacaoId = typeof congregacao_id === 'string' 
        ? parseInt(congregacao_id, 10) 
        : congregacao_id;
      
      if (!isNaN(congregacaoId)) {
        conditions.push(`a.congregacao_id = $${params.length + 1}`);
        params.push(congregacaoId);
      }
    }

    if (dataInicio) {
      conditions.push(`a.data >= $${params.length + 1}`);
      params.push(dataInicio);
    }

    if (dataFim) {
      conditions.push(`a.data <= $${params.length + 1}`);
      params.push(dataFim);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.data';

    // Pagination
    const limit = options?.limit ?? filters._limit ?? null;
    const offset = options?.offset ?? filters._offset ?? 0;

    const dataParams = [...params];
    if (limit) {
      dataParams.push(limit);
      query += ` LIMIT $${dataParams.length}`;
      dataParams.push(offset);
      query += ` OFFSET $${dataParams.length}`;
    }

    const dataResult = await pool.query(query, dataParams);
    
    // Build a proper count query using the same conditions and params
    const countBase = `SELECT COUNT(*)::int as count FROM agendamentos a
      LEFT JOIN discursos d ON a.discurso_id = d.id
      LEFT JOIN oradores o ON a.orador_id = o.id
      LEFT JOIN congregacoes c ON a.congregacao_id = c.id`;
    
    // Rebuild conditions for count query (same logic as main query)
    const countConditions = [];
    const countParams = [];
    let countIdx = 0;
    
    if (busca) {
      countIdx += 1;
      countConditions.push(`(CAST(d.numero AS TEXT) ILIKE $${countIdx} OR d.tema ILIKE $${countIdx} OR o.nome ILIKE $${countIdx} OR c.nome ILIKE $${countIdx})`);
      countParams.push(`%${busca}%`);
    }
    
    // Suporte para filtro por tipo único ou múltiplos tipos
    if (tipos && Array.isArray(tipos) && tipos.length > 0) {
      const placeholders = tipos.map((_, i) => `$${countIdx + i + 1}`).join(', ');
      countConditions.push(`a.tipo IN (${placeholders})`);
      countIdx += tipos.length;
      countParams.push(...tipos);
    } else if (tipo) {
      countIdx += 1;
      countConditions.push(`a.tipo = $${countIdx}`);
      countParams.push(tipo);
    }
    
    if (congregacao_id !== undefined && congregacao_id !== null && congregacao_id !== '') {
      const congregacaoId = typeof congregacao_id === 'string' 
        ? parseInt(congregacao_id, 10) 
        : congregacao_id;
      
      if (!isNaN(congregacaoId)) {
        countIdx += 1;
        countConditions.push(`a.congregacao_id = $${countIdx}`);
        countParams.push(congregacaoId);
      }
    }
    
    if (dataInicio) {
      countIdx += 1;
      countConditions.push(`a.data >= $${countIdx}`);
      countParams.push(dataInicio);
    }
    
    if (dataFim) {
      countIdx += 1;
      countConditions.push(`a.data <= $${countIdx}`);
      countParams.push(dataFim);
    }
    
    const countQueryFinal = countBase + (countConditions.length > 0 ? ' WHERE ' + countConditions.join(' AND ') : '');
    const countResult = await pool.query(countQueryFinal, countParams);

    // Normalizar as datas retornadas do banco para evitar problemas de timezone
    return { items: normalizeResults(dataResult.rows), total: countResult.rows[0].count };
  }

  static async getFuturos(filters = {}) {
    const result = await this.getAll({ ...filters, dataInicio: new Date().toISOString().split('T')[0] });
    // Retornar apenas o array de items para manter compatibilidade com código existente
    return result.items || [];
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT a.*, 
              d.numero as discurso_numero, 
              d.tema as discurso_tema,
              o.nome as orador_nome,
              c.nome as congregacao_nome
       FROM agendamentos a
       LEFT JOIN discursos d ON a.discurso_id = d.id
       LEFT JOIN oradores o ON a.orador_id = o.id
       LEFT JOIN congregacoes c ON a.congregacao_id = c.id
       WHERE a.id = $1`,
      [id]
    );
    // Normalizar a data retornada do banco para evitar problemas de timezone
    return normalizeResult(result.rows[0]);
  }

  static async create(data) {
    const { data: dataAgendamento, discurso_id, orador_id, congregacao_id, tipo, observacoes } = data;
    const dId = parseNullableInt(discurso_id);
    const oId = parseNullableInt(orador_id);
    const cId = parseNullableInt(congregacao_id);

    // Normalizar a data para garantir formato YYYY-MM-DD sem problemas de timezone
    const dataNormalizada = normalizeDate(dataAgendamento);
    
    // Garantir que a data seja tratada como DATE local, não UTC
    // Usar CAST explícito para evitar problemas de timezone
    const result = await pool.query(
      `INSERT INTO agendamentos (data, discurso_id, orador_id, congregacao_id, tipo, observacoes)
       VALUES ($1::date, $2, $3, $4, $5, $6) RETURNING *`,
      [dataNormalizada, dId, oId, cId, tipo, observacoes]
    );
    // Normalizar a data retornada do banco para evitar problemas de timezone
    return normalizeResult(result.rows[0]);
  }

  static async update(id, data) {
    const { data: dataAgendamento, discurso_id, orador_id, congregacao_id, tipo, observacoes } = data;
    const dId = parseNullableInt(discurso_id);
    const oId = parseNullableInt(orador_id);
    const cId = parseNullableInt(congregacao_id);

    // Normalizar a data para garantir formato YYYY-MM-DD sem problemas de timezone
    const dataNormalizada = normalizeDate(dataAgendamento);
    
    // Garantir que a data seja tratada como DATE local, não UTC
    // Usar CAST explícito para evitar problemas de timezone
    const result = await pool.query(
      `UPDATE agendamentos 
       SET data = $1::date, discurso_id = $2, orador_id = $3, congregacao_id = $4, tipo = $5, observacoes = $6
       WHERE id = $7 RETURNING *`,
      [dataNormalizada, dId, oId, cId, tipo, observacoes, id]
    );
    // Normalizar a data retornada do banco para evitar problemas de timezone
    return normalizeResult(result.rows[0]);
  }

  static async delete(id) {
    await pool.query('DELETE FROM agendamentos WHERE id = $1', [id]);
  }

  static async marcarComoRealizado(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar agendamento com informações do discurso
      const agendamento = await client.query(
        `SELECT a.*, d.numero as discurso_numero
         FROM agendamentos a
         LEFT JOIN discursos d ON a.discurso_id = d.id
         WHERE a.id = $1`,
        [id]
      );

      if (agendamento.rows.length === 0) {
        throw new Error('Agendamento não encontrado');
      }

      const ag = agendamento.rows[0];

      // Inserir no histórico
      // Normalizar a data ao copiar para histórico para evitar problemas de timezone
      const dataNormalizada = normalizeDate(ag.data);
      await client.query(
        `INSERT INTO historico_discursos (discurso_id, orador_id, congregacao_id, data, tipo, observacoes)
         VALUES ($1, $2, $3, $4::date, $5, $6)`,
        [ag.discurso_id, ag.orador_id, ag.congregacao_id, dataNormalizada, ag.tipo, ag.observacoes]
      );

      // Atualizar a coluna esbocos do orador se houver discurso e orador
      if (ag.orador_id && ag.discurso_numero) {
        // Buscar esboços atuais do orador
        const oradorRes = await client.query(
          'SELECT esbocos FROM oradores WHERE id = $1',
          [ag.orador_id]
        );

        if (oradorRes.rows.length > 0) {
          const esbocosAtuais = oradorRes.rows[0].esbocos || '';
          const numeroDiscurso = parseInt(ag.discurso_numero, 10);
          
          if (!isNaN(numeroDiscurso)) {
            // Parse dos números de esboços existentes
            // Suporta tanto vírgula quanto ponto e vírgula como separador
            const separador = esbocosAtuais.includes(',') ? ',' : ';';
            const numerosEsbocos = esbocosAtuais
              .split(separador)
              .map(num => num.trim())
              .filter(num => num !== '')
              .map(num => {
                const parsed = parseInt(num, 10);
                return isNaN(parsed) ? null : parsed;
              })
              .filter(num => num !== null);

            // Adicionar o número do discurso se ainda não estiver na lista
            if (!numerosEsbocos.includes(numeroDiscurso)) {
              numerosEsbocos.push(numeroDiscurso);
              numerosEsbocos.sort((a, b) => a - b); // Ordenar numericamente
              
              // Formatar de volta como string usando vírgula (formato do banco: "4, 16, 24")
              const novosEsbocos = numerosEsbocos.join(', ');
              
              // Atualizar a coluna esbocos do orador
              await client.query(
                'UPDATE oradores SET esbocos = $1 WHERE id = $2',
                [novosEsbocos, ag.orador_id]
              );
            }
          }
        }
      }

      // Deletar agendamento
      await client.query('DELETE FROM agendamentos WHERE id = $1', [id]);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Retorna ocorrências recentes (no histórico ou em agendamentos passados) para um discurso
  // útil para checar se o mesmo discurso foi proferido nos últimos N dias
  static async getRecentDiscursoOccurrences(discurso_id, days = 180) {
    if (!discurso_id) return [];

    // Calcular data limite (YYYY-MM-DD)
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoff = normalizeDate(cutoffDate);

    const result = await pool.query(
      `SELECT 'historico'::text as source, id, discurso_id, orador_id, congregacao_id, data, tipo, observacoes
       FROM historico_discursos
       WHERE discurso_id = $1 AND data >= $2
       UNION ALL
       SELECT 'agendamento'::text as source, id, discurso_id, orador_id, congregacao_id, data, tipo, observacoes
       FROM agendamentos
       WHERE discurso_id = $1 AND data >= $2
       ORDER BY data DESC`,
      [discurso_id, cutoff]
    );

    // Normalizar datas retornadas
    return normalizeResults(result.rows);
  }

  static async getSemanasVazias(dataInicio, dataFim) {
    // Consider Saturdays and Sundays with agendamentos of type 'local' or 'recebido'
    // Return the Monday (week start) for each week that has at least one valid weekend agendamento
    const result = await pool.query(
      `SELECT DISTINCT date_trunc('week', data)::date as semana
       FROM agendamentos
       WHERE data BETWEEN $1 AND $2
         AND tipo IN ('local', 'recebido')
         AND EXTRACT(DOW FROM data)::int IN (0, 6)
       ORDER BY semana`,
      [dataInicio, dataFim]
    );
    return result.rows;
  }
}
module.exports = Agendamento;

