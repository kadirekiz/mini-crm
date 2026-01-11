const { Client } = require('pg');
const { execSync } = require('child_process');

require('dotenv').config();

function getPgConn({ database }) {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || 'postgres';
  return { host, port, user, password, database };
}

async function ensureTestDatabaseExists() {
  const testDb = process.env.DB_NAME_TEST || 'mini_crm_test';

  // "postgres" sistem DB'sine bağlanıp test DB'yi oluşturuyoruz
  const client = new Client(getPgConn({ database: 'postgres' }));
  await client.connect();

  const check = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDb]);
  if (check.rowCount === 0) {
    await client.query(`CREATE DATABASE "${testDb}"`);
  }

  await client.end();
}

async function resetTestSchema() {
  const testDb = process.env.DB_NAME_TEST || 'mini_crm_test';
  const client = new Client(getPgConn({ database: testDb }));
  await client.connect();

  // Testler arası / test koşuları arası kalıntıları önlemek için public schema'yı sıfırlarız.
  // Bu, (migrate:undo:all) gibi down migration'ların veri nedeniyle patlamasını da engeller.
  await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await client.query('CREATE SCHEMA public;');

  // Varsayılan yetkileri tekrar verelim (bazı ortamlarda gerekli olabiliyor)
  const user = process.env.DB_USER || 'postgres';
  await client.query(`GRANT ALL ON SCHEMA public TO "${user}";`);
  await client.query('GRANT ALL ON SCHEMA public TO public;');

  await client.end();
}

module.exports = async () => {
  process.env.NODE_ENV = 'test';

  await ensureTestDatabaseExists();
  await resetTestSchema();

  // Migration'ları temiz bir şemaya uygula
  const env = { ...process.env, NODE_ENV: 'test' };
  execSync('npx sequelize db:migrate', { stdio: 'inherit', env });
};
