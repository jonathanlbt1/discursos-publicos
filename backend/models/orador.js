const pool = require('../config/database');

class Orador {
  static async getAll(filters = {}, options = {}) {
    const { busca, ativo } = filters;
    const limit = options?.limit ?? filters._limit ?? null;
    const offset = options?.offset ?? filters._offset ?? 0;
    // Join with congregacoes to provide congregacao info
    let baseQuery = `SELECT o.*, c.id AS congregacao_id, c.nome AS congregacao_nome
                 FROM oradores o
                 LEFT JOIN congregacoes c ON o.congregacao_id = c.id`;
    const params = [];
    const conditions = [];

    if (busca) {
      params.push(`%${busca}%`);
      conditions.push(`(o.nome ILIKE $${params.length} OR o.email ILIKE $${params.length} OR o.celular ILIKE $${params.length})`);
    }

    if (filters.congregacao_id !== undefined && filters.congregacao_id !== null && filters.congregacao_id !== '') {
      // Converter para número se for string
      const congregacaoId = typeof filters.congregacao_id === 'string' 
        ? parseInt(filters.congregacao_id, 10) 
        : filters.congregacao_id;
      
      if (!isNaN(congregacaoId)) {
        params.push(congregacaoId);
        conditions.push(`o.congregacao_id = $${params.length}`);
      }
    }

    if (ativo !== undefined) {
      params.push(ativo);
      conditions.push(`o.ativo = $${params.length}`);
    }

    let where = '';
    if (conditions.length > 0) where = ' WHERE ' + conditions.join(' AND ');

    const order = ' ORDER BY o.nome';

    let dataQuery = baseQuery + where + order;
    const dataParams = [...params];
    if (limit) {
      dataParams.push(limit);
      dataQuery += ` LIMIT $${dataParams.length}`;
      dataParams.push(offset);
      dataQuery += ` OFFSET $${dataParams.length}`;
    }

    const dataResult = await pool.query(dataQuery, dataParams);

    // Count
    const countQuery = `SELECT COUNT(*)::int as count FROM oradores o LEFT JOIN congregacoes c ON o.congregacao_id = c.id` + where;
    const countResult = await pool.query(countQuery, params);
    return { items: dataResult.rows, total: countResult.rows[0].count };
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT o.*, c.id AS congregacao_id, c.nome AS congregacao_nome
       FROM oradores o
       LEFT JOIN congregacoes c ON o.congregacao_id = c.id
       WHERE o.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { nome, celular, email, ativo = true, congregacao_id = null } = data;
    const result = await pool.query(
      `INSERT INTO oradores (nome, celular, email, ativo, congregacao_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nome, celular, email, ativo, congregacao_id]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nome, celular, email, ativo, congregacao_id = null } = data;
    const result = await pool.query(
      `UPDATE oradores 
       SET nome = $1, celular = $2, email = $3, ativo = $4, congregacao_id = $5
       WHERE id = $6 RETURNING *`,
      [nome, celular, email, ativo, congregacao_id, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM oradores WHERE id = $1', [id]);
  }

  static async getHistorico(id) {
    const result = await pool.query(
      `SELECT hd.*, d.numero, d.tema, c.nome as congregacao_nome
       FROM historico_discursos hd
       JOIN discursos d ON hd.discurso_id = d.id
       LEFT JOIN congregacoes c ON hd.congregacao_id = c.id
       WHERE hd.orador_id = $1 AND hd.tipo = 'enviado'
       ORDER BY hd.data DESC`,
      [id]
    );
    return result.rows;
  }
}

module.exports = Orador;

