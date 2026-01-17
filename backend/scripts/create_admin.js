/**
 * Script para criar um usuário admin inicial de forma segura.
 * Uso (PowerShell):
 *   $env:ADMIN_NAME='Jonathan Moraes'; $env:ADMIN_EMAIL='jonathanlbt@gmail.com'; $env:ADMIN_PASSWORD='...'; node backend/scripts/create_admin.js
 * Ou forneça args: node backend/scripts/create_admin.js --name "Jonathan" --email "a@b" --password "..."
 */

const Usuario = require('../models/usuario');
const pool = require('../config/database');
require('dotenv').config();

async function createAdmin({ nome, email, senha, force = false }) {
  try {
    if (!nome || !email || !senha) {
      console.error('Nome, email e senha são obrigatórios. Forneça via env ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD ou via args.');
      process.exit(1);
    }

    // Verificar se já existe um admin
    const existing = await pool.query("SELECT id, email, role FROM usuarios WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (u.role === 'admin' && !force) {
        console.log(`Usuário com email ${email} já existe com role 'admin'. Nada a fazer.`);
        process.exit(0);
      }
      if (!force) {
        console.log(`Usuário com email ${email} já existe (role=${u.role}). Use --force to overwrite role to admin.`);
        process.exit(0);
      }
      // If force, fall through to create (Usuario.create will create new record; to change existing role we'd update instead)
    }

    // If user exists but force, update role and password
    if (existing.rows.length > 0 && force) {
      const userId = existing.rows[0].id;
      await Usuario.update(userId, { nome, email, role: 'admin', ativo: true });
      await Usuario.updatePassword(userId, senha);
      console.log(`Usuário existente ${email} atualizado para role 'admin'.`);
      process.exit(0);
    }

    // Create new admin
    const usuario = await Usuario.create({ nome, email, senha, role: 'admin' });
    console.log(`Admin criado com id=${usuario.id} email=${usuario.email}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar admin:', err);
    process.exit(1);
  }
}

// Simple CLI args parser (no external deps)
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const nome = args.name || args.nome || process.env.ADMIN_NAME;
const email = args.email || process.env.ADMIN_EMAIL;
const senha = args.password || args.senha || process.env.ADMIN_PASSWORD;
const force = args.force === true || args.force === 'true' || false;

createAdmin({ nome, email, senha, force });
