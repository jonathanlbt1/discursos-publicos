/**
 * Migration: create or update master admin user
 *
 * Usage: from the repository root run:
 *   node backend\\migrations\\run_create_admin_user.js
 *
 * This script will:
 *  - hash the provided password with bcrypt (saltRounds = 10)
 *  - insert the user if email does not exist
 *  - if the email exists, it will update role to 'admin', set ativo = true,
 *    and update the senha_hash to the provided password
 *
 * IMPORTANT: keep this file secure and remove it after use if you don't want it
 * present in the repository history.
 */

const pool = require('../config/database');
const bcrypt = require('bcrypt');

async function run() {
  const nome = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;
  const role = 'admin';
  const ativo = true;

  try {
    console.log('Gerando hash da senha...');
    const senha_hash = await bcrypt.hash(senha, 10);

    // Verifica se já existe um usuário com o email
    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      console.log(`Usuário já existe (id=${id}). Atualizando role/ativo/senha_hash...`);
      await pool.query(
        'UPDATE usuarios SET nome = $1, senha_hash = $2, role = $3, ativo = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
        [nome, senha_hash, role, ativo, id]
      );
      console.log('✓ Usuário atualizado para admin');
    } else {
      console.log('Inserindo novo usuário admin...');
      const result = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [nome, email, senha_hash, role, ativo]
      );
      console.log(`✓ Usuário criado com id=${result.rows[0].id}`);
    }

    console.log('\nConcluído.');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar/atualizar usuário admin:', err);
    process.exit(1);
  }
}

// Execute immediately
(async () => {
  await run();
})();
