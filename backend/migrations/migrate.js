const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Pre-flight DB environment validation to provide clearer errors
function validateDbEnv() {
  const connectionString = process.env.DATABASE_URL || null;
  if (connectionString) {
    console.log('Using DATABASE_URL for DB connection (from environment)');
    return;
  }

  const host = process.env.DB_HOST || null;
  const port = process.env.DB_PORT || null;
  const database = process.env.DB_NAME || process.env.DB_DATABASE || null;
  const user = process.env.DB_USER || null;
  const password = process.env.DB_PASSWORD == null ? null : String(process.env.DB_PASSWORD);

  const missing = [];
  if (!host) missing.push('DB_HOST');
  if (!port) missing.push('DB_PORT');
  if (!database) missing.push('DB_NAME or DB_DATABASE');
  if (!user) missing.push('DB_USER');
  if (password === null) missing.push('DB_PASSWORD');

  if (missing.length > 0) {
    console.error('\nERROR: Missing database connection information.');
    console.error('Please set a DATABASE_URL or all of the following environment variables:');
    console.error('  DB_HOST, DB_PORT, DB_NAME (or DB_DATABASE), DB_USER, DB_PASSWORD');
    console.error('\nMissing: ' + missing.join(', '));
    console.error('\nFor local testing you can set them in PowerShell for this session:');
    console.error("  $env:DB_HOST='your_host'; $env:DB_PORT='5432'; $env:DB_NAME='discursos'; $env:DB_USER='postgres'; $env:DB_PASSWORD='yourpassword'");
    console.error("Or create a .env file in the project root with these values (keep it out of git).");
    process.exit(1);
  }

  console.log(`Using DB connection via host=${host} port=${port} database=${database} user=${user}`);
}

validateDbEnv();

async function migrate() {
  try {
    console.log('Iniciando migração do banco de dados...');
    
    // Executar schema principal
    console.log('→ Criando tabelas principais...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✓ Tabelas principais criadas');
    
    // Executar schema de autenticação
    console.log('→ Criando tabela de usuários...');
    const authSchemaPath = path.join(__dirname, 'auth-schema.sql');
    const authSchema = fs.readFileSync(authSchemaPath, 'utf8');
    await pool.query(authSchema);
    console.log('✓ Tabela de usuários criada');

    // Inserir congregacoes
    const insertCongregacoesPath = path.join(__dirname, 'insert_congregacoes.sql');
    if (fs.existsSync(insertCongregacoesPath)) {
      console.log('→ Inserindo congregações iniciais...');
      const insertCongregacoes = fs.readFileSync(insertCongregacoesPath, 'utf8');
      await pool.query(insertCongregacoes);
      console.log('✓ Congregações inseridas (ou já existentes)');
    }

    // Executar migrations adicionais (arquivos add_*.sql)
    // Isto garante que alterações incrementais (ex: adicionar coluna congregacao_id em oradores)
    // sejam aplicadas antes de executar inserts dependentes.
    const files = fs.readdirSync(__dirname).filter(f => /^add_.*\.sql$/.test(f)).sort();
    for (const f of files) {
      const p = path.join(__dirname, f);
      try {
        console.log(`→ Aplicando migration adicional: ${f}`);
        const sql = fs.readFileSync(p, 'utf8');
        await pool.query(sql);
        console.log(`✓ Migration aplicada: ${f}`);
      } catch (err) {
        console.error(`Erro aplicando migration ${f}:`, err);
        throw err;
      }
    }

    // Inserir oradores
    const insertOradoresPath = path.join(__dirname, 'insert_oradores.sql');
    if (fs.existsSync(insertOradoresPath)) {
      console.log('→ Inserindo oradores iniciais...');
      const insertOradores = fs.readFileSync(insertOradoresPath, 'utf8');
      await pool.query(insertOradores);
      console.log('✓ Oradores inseridos (ou já existentes)');
    }

    // Executar inserts/seed (opcional)
    const insertDiscursosPath = path.join(__dirname, 'insert_discursos.sql');
    if (fs.existsSync(insertDiscursosPath)) {
      console.log('→ Inserindo discursos iniciais...');
      const insertDiscursos = fs.readFileSync(insertDiscursosPath, 'utf8');
      await pool.query(insertDiscursos);
      console.log('✓ Discursos inseridos (ou já existentes)');
    }

    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('→ Executando seed (opcional)...');
      const seed = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seed);
      console.log('✓ Seed executado');
    }
    
    console.log('\n✓ Migração concluída com sucesso!');
    console.log('\n⚠️  IMPORTANTE: Crie seu primeiro usuário através do endpoint /api/auth/register');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();

