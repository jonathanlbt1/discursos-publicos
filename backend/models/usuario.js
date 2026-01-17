const pool = require('../config/database');
const bcrypt = require('bcrypt');

class Usuario {
  static async getAll(filters = {}, options = {}) {
    const { busca, role, ativo } = filters;
    const limit = options?.limit ?? filters._limit ?? null;
    const offset = options?.offset ?? filters._offset ?? 0;

    let query = 'SELECT id, nome, email, role, ativo, ultimo_acesso, created_at FROM usuarios';
    const params = [];
    const conditions = [];

    if (busca) {
      params.push(`%${busca}%`);
      conditions.push(`(nome ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (ativo !== undefined) {
      params.push(ativo);
      conditions.push(`ativo = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY nome';

    const dataParams = [...params];
    if (limit) {
      dataParams.push(limit);
      query += ` LIMIT $${dataParams.length}`;
      dataParams.push(offset);
      query += ` OFFSET $${dataParams.length}`;
    }

    const dataResult = await pool.query(query, dataParams);
    const countQuery = `SELECT COUNT(*)::int as count FROM usuarios${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}`;
    const countResult = await pool.query(countQuery, params);
    return { items: dataResult.rows, total: countResult.rows[0].count };
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT id, nome, email, role, ativo, ultimo_acesso, created_at FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async getByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async create(data) {
    const { nome, email, senha, role = 'usuario' } = data;
    
    // Hash da senha
    const senha_hash = await bcrypt.hash(senha, 10);
    
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role, ativo, created_at`,
      [nome, email, senha_hash, role]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { nome, email, role, ativo } = data;
    const result = await pool.query(
      `UPDATE usuarios 
       SET nome = $1, email = $2, role = $3, ativo = $4
       WHERE id = $5 
       RETURNING id, nome, email, role, ativo, created_at`,
      [nome, email, role, ativo, id]
    );
    return result.rows[0];
  }

  static async updatePassword(id, novaSenha) {
    const senha_hash = await bcrypt.hash(novaSenha, 10);
    await pool.query(
      'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
      [senha_hash, id]
    );
  }

  static async delete(id) {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  }

  static async verificarSenha(senha, senha_hash) {
    return await bcrypt.compare(senha, senha_hash);
  }

  static async atualizarUltimoAcesso(id) {
    await pool.query(
      'UPDATE usuarios SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }
}

module.exports = Usuario;

