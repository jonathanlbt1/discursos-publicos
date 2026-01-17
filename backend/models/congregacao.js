const pool = require('../config/database');

class Congregacao {
  static async getAll(filters = {}, options = {}) {
    const { busca } = filters;
    const limit = options.limit || filters._limit || null;
    const offset = options.offset || filters._offset || 0;

    let params = [];
    let where = '';
    if (busca) {
      params.push(`%${busca}%`);
      where = ` WHERE nome ILIKE $1 OR endereco ILIKE $1 OR nome_contato ILIKE $1 OR dia_semana ILIKE $1`;
    }

    const order = ' ORDER BY nome';

    let dataQuery = `SELECT * FROM congregacoes${where}${order}`;
    const dataParams = [...params];
    if (limit) {
      dataParams.push(limit);
      dataQuery += ` LIMIT $${dataParams.length}`;
      dataParams.push(offset);
      dataQuery += ` OFFSET $${dataParams.length}`;
    }

    const dataResult = await pool.query(dataQuery, dataParams);
    const countResult = await pool.query(`SELECT COUNT(*)::int as count FROM congregacoes${where}`, params);
    return { items: dataResult.rows, total: countResult.rows[0].count };
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM congregacoes WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { nome, endereco, horario, nome_contato, celular_contato, dia_semana } = data;
    const result = await pool.query(
      `INSERT INTO congregacoes (nome, endereco, horario, nome_contato, celular_contato, dia_semana)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nome, endereco, horario, nome_contato, celular_contato, dia_semana]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nome, endereco, horario, nome_contato, celular_contato, dia_semana } = data;
    const result = await pool.query(
      `UPDATE congregacoes 
       SET nome = $1, endereco = $2, horario = $3, nome_contato = $4, celular_contato = $5, dia_semana = $6
       WHERE id = $7 RETURNING *`,
      [nome, endereco, horario, nome_contato, celular_contato, dia_semana, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM congregacoes WHERE id = $1', [id]);
  }

  static async getHistoricoRecebidos(id) {
    const result = await pool.query(
      `SELECT hd.*, d.numero, d.tema, o.nome as orador_nome
       FROM historico_discursos hd
       JOIN discursos d ON hd.discurso_id = d.id
       JOIN oradores o ON hd.orador_id = o.id
       WHERE hd.congregacao_id = $1 AND hd.tipo = 'recebido'
       ORDER BY hd.data DESC`,
      [id]
    );
    return result.rows;
  }
}

module.exports = Congregacao;

