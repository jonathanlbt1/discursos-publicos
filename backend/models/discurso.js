const pool = require('../config/database');

class Discurso {
  // Supports pagination via options.limit and options.offset
  static async getAll(filters = {}, options = {}) {
    const { busca } = filters;
    const limit = options.limit || null;
    const offset = options.offset || 0;
    const params = [];

    let where = '';
    if (busca) {
      params.push(`%${busca}%`);
      where = ` WHERE CAST(numero AS TEXT) ILIKE $${params.length} OR tema ILIKE $${params.length}`;
    }

    const order = ' ORDER BY numero';

    // Data query with limit/offset
    let dataQuery = `SELECT * FROM discursos${where}${order}`;
    if (limit) {
      params.push(limit);
      dataQuery += ` LIMIT $${params.length}`;
      params.push(offset);
      dataQuery += ` OFFSET $${params.length}`;
    }

    const dataResult = await pool.query(dataQuery, params);

    // Count query (reuse same where clause but separate params)
    const countParams = [];
    let countWhere = '';
    if (busca) {
      countParams.push(`%${busca}%`);
      countWhere = ` WHERE CAST(numero AS TEXT) ILIKE $1 OR tema ILIKE $1`;
    }
    const countResult = await pool.query(`SELECT COUNT(*)::int as count FROM discursos${countWhere}`, countParams);

    return { items: dataResult.rows, total: countResult.rows[0].count };
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM discursos WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { numero, tema, data_versao_esboco } = data;
    const result = await pool.query(
      `INSERT INTO discursos (numero, tema, data_versao_esboco)
       VALUES ($1, $2, $3) RETURNING *`,
      [numero, tema, data_versao_esboco]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { numero, tema, data_versao_esboco } = data;
    const result = await pool.query(
      `UPDATE discursos 
       SET numero = $1, tema = $2, data_versao_esboco = $3
       WHERE id = $4 RETURNING *`,
      [numero, tema, data_versao_esboco, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM discursos WHERE id = $1', [id]);
  }

  static async getUltimaDataLocal(discursoId) {
    const result = await pool.query(
      `SELECT MAX(data) as ultima_data
       FROM historico_discursos
       WHERE discurso_id = $1 AND tipo = 'local'`,
      [discursoId]
    );
    return result.rows[0]?.ultima_data;
  }

  static async getHistorico(discursoId) {
    const result = await pool.query(
      `SELECT hd.*, o.nome as orador_nome, c.nome as congregacao_nome
       FROM historico_discursos hd
       LEFT JOIN oradores o ON hd.orador_id = o.id
       LEFT JOIN congregacoes c ON hd.congregacao_id = c.id
       WHERE hd.discurso_id = $1
       ORDER BY hd.data DESC`,
      [discursoId]
    );
    return result.rows;
  }
}

module.exports = Discurso;

