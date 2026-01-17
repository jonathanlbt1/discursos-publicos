const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Prefer IPv4 DNS results when available. Some hosting platforms (including
// container networks) do not have IPv6 routing and DNS may return IPv6 first,
// causing `connect ENETUNREACH` errors. This sets Node's resolver to prefer
// IPv4 (works on Node 18+). If `setDefaultResultOrder` is not available the
// environment will be unchanged.
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
    console.log('DNS resolver configured to prefer IPv4 addresses (ipv4first)');
  }
} catch {
  // Non-fatal; continue with default resolver behavior
}

// Load dotenv: prefer project root .env (two levels up from this file), but fall back to default
try {
  require('dotenv').config();
  const projectEnv = path.resolve(__dirname, '..', '..', '.env');
  if (fs.existsSync(projectEnv)) {
    require('dotenv').config({ path: projectEnv });
  }
} catch {
  // ignore dotenv load errors; we'll surface connection errors later
}

// Prefer a single DATABASE_URL when provided (Render gives an internal DATABASE_URL you can use).
// Fall back to individual DB_... env vars for compatibility with existing setups.
const connectionString = process.env.DATABASE_URL || null;

// PGSSLMODE can be set to 'require' to force SSL (useful when connecting to Render's public host).
// If not set, we default to 'prefer' for safety, but INTERNAL Render URLs usually don't need TLS.
const pgSslMode = process.env.PGSSLMODE || process.env.PGSSL || null;

// Build pool options. When using a connection string, pass that to pg. Otherwise use separate fields.
let poolConfig = {};
if (connectionString) {
  poolConfig.connectionString = connectionString;
}

// Determine SSL configuration
// If PGSSLMODE === 'require' or the connection string references a public render host, enable ssl.
let sslOption = false;
if (pgSslMode && pgSslMode.toLowerCase() === 'require') {
  sslOption = { rejectUnauthorized: false };
} else if (connectionString && /render\.com/.test(connectionString)) {
  // Public Render DBs require SSL; disable cert validation for convenience (Render uses trusted certs).
  sslOption = { rejectUnauthorized: false };
}

if (sslOption) {
  poolConfig.ssl = sslOption;
}

// If no connection string provided, construct from individual env vars (keeps backward compatibility)
if (!connectionString) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
  const database = process.env.DB_NAME || process.env.DB_DATABASE || 'discursos';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD == null ? null : String(process.env.DB_PASSWORD);

  if (password === null) {
    console.error('WARNING: DB_PASSWORD is not set. Please set it in your environment or .env file.');
    // Let Pool throw a descriptive error on connect if needed.
  }

  poolConfig = Object.assign(poolConfig, { host, port, database, user, password });
}

// DNS diagnostics: log A/AAAA records for the DB host (non-blocking)
try {
  const dbHostForDiag = (process.env.DATABASE_URL && (() => {
    try { return new URL(process.env.DATABASE_URL).hostname; } catch { return null; }
  })()) || process.env.DB_HOST || null;
  if (dbHostForDiag) {
    dns.promises.resolve4(dbHostForDiag)
      .then(addrs => console.log(`DB DNS A records for ${dbHostForDiag}: ${addrs.join(', ')}`))
      .catch(() => console.log(`No A records (IPv4) found for DB host ${dbHostForDiag}`));
    dns.promises.resolve6(dbHostForDiag)
      .then(addrs => console.log(`DB DNS AAAA records for ${dbHostForDiag}: ${addrs.join(', ')}`))
      .catch(() => console.log(`No AAAA records (IPv6) found for DB host ${dbHostForDiag}`));
  }
} catch (diagErr) {
  // Non-fatal diagnostic error
  console.error('DB DNS diagnostics error:', diagErr && diagErr.message ? diagErr.message : diagErr);
}

// Create a single pool instance
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Erro inesperado no cliente PostgreSQL', err);
  process.exit(-1);
});

module.exports = pool;

