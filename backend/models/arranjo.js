const pool = require('../config/database');

class Arranjo {
  static async getAll(_filters = {}, options = {}) {
    const limit = options.limit || null;
    const offset = options.offset || 0;
    const params = [];

    // Ordenação padrão: mais antigo primeiro (ASC)
    const order = ' ORDER BY ano ASC, mes ASC';

    // Data query with limit/offset
    let dataQuery = `SELECT a.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', c.id,
            'nome', c.nome
          ) ORDER BY c.nome
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
      ) as congregacoes
      FROM arranjos a
      LEFT JOIN arranjos_congregacoes ac ON a.id = ac.arranjo_id
      LEFT JOIN congregacoes c ON ac.congregacao_id = c.id
      GROUP BY a.id
      ${order}`;

    if (limit) {
      params.push(limit);
      dataQuery += ` LIMIT $${params.length}`;
      params.push(offset);
      dataQuery += ` OFFSET $${params.length}`;
    }

    const dataResult = await pool.query(dataQuery, params);

    // Count query
    const countResult = await pool.query('SELECT COUNT(*)::int as count FROM arranjos');

    return { items: dataResult.rows, total: countResult.rows[0].count };
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT a.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'nome', c.nome
            ) ORDER BY c.nome
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as congregacoes
        FROM arranjos a
        LEFT JOIN arranjos_congregacoes ac ON a.id = ac.arranjo_id
        LEFT JOIN congregacoes c ON ac.congregacao_id = c.id
        WHERE a.id = $1
        GROUP BY a.id`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { ano, mes, congregacoes } = data;
    
    // Validar mês
    if (mes < 1 || mes > 12) {
      throw new Error('Mês deve estar entre 1 e 12');
    }

    // Verificar se já existe arranjo para o mesmo ano/mês
    const existente = await pool.query(
      'SELECT id FROM arranjos WHERE ano = $1 AND mes = $2',
      [ano, mes]
    );

    if (existente.rows.length > 0) {
      throw new Error('Já existe um arranjo para este ano e mês');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Criar arranjo
      const arranjoResult = await client.query(
        'INSERT INTO arranjos (ano, mes) VALUES ($1, $2) RETURNING *',
        [ano, mes]
      );
      const arranjo = arranjoResult.rows[0];

      // Inserir relacionamentos com congregações
      if (congregacoes && Array.isArray(congregacoes) && congregacoes.length > 0) {
        // Validar que todas as congregações existem
        const congregacoesIds = congregacoes.map(c => parseInt(c.id || c, 10));
        const validacao = await client.query(
          'SELECT id FROM congregacoes WHERE id = ANY($1::int[])',
          [congregacoesIds]
        );

        if (validacao.rows.length !== congregacoesIds.length) {
          throw new Error('Uma ou mais congregações não foram encontradas');
        }

        // Inserir relacionamentos
        for (const congregacaoId of congregacoesIds) {
          await client.query(
            'INSERT INTO arranjos_congregacoes (arranjo_id, congregacao_id) VALUES ($1, $2)',
            [arranjo.id, congregacaoId]
          );
        }
      }

      await client.query('COMMIT');

      // Retornar arranjo completo com congregações
      return await this.getById(arranjo.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const { ano, mes, congregacoes } = data;
    
    // Validar mês
    if (mes < 1 || mes > 12) {
      throw new Error('Mês deve estar entre 1 e 12');
    }

    // Verificar se já existe outro arranjo para o mesmo ano/mês
    const existente = await pool.query(
      'SELECT id FROM arranjos WHERE ano = $1 AND mes = $2 AND id != $3',
      [ano, mes, id]
    );

    if (existente.rows.length > 0) {
      throw new Error('Já existe outro arranjo para este ano e mês');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Atualizar arranjo
      await client.query(
        'UPDATE arranjos SET ano = $1, mes = $2 WHERE id = $3',
        [ano, mes, id]
      );

      // Remover relacionamentos antigos
      await client.query(
        'DELETE FROM arranjos_congregacoes WHERE arranjo_id = $1',
        [id]
      );

      // Inserir novos relacionamentos com congregações
      if (congregacoes && Array.isArray(congregacoes) && congregacoes.length > 0) {
        const congregacoesIds = congregacoes.map(c => parseInt(c.id || c, 10));
        
        // Validar que todas as congregações existem
        const validacao = await client.query(
          'SELECT id FROM congregacoes WHERE id = ANY($1::int[])',
          [congregacoesIds]
        );

        if (validacao.rows.length !== congregacoesIds.length) {
          throw new Error('Uma ou mais congregações não foram encontradas');
        }

        // Inserir relacionamentos
        for (const congregacaoId of congregacoesIds) {
          await client.query(
            'INSERT INTO arranjos_congregacoes (arranjo_id, congregacao_id) VALUES ($1, $2)',
            [id, congregacaoId]
          );
        }
      }

      await client.query('COMMIT');

      // Retornar arranjo completo com congregações
      return await this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Deletar relacionamentos (cascade já faz isso, mas sendo explícito)
      await client.query('DELETE FROM arranjos_congregacoes WHERE arranjo_id = $1', [id]);
      
      // Deletar arranjo
      await client.query('DELETE FROM arranjos WHERE id = $1', [id]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Arranjo;

