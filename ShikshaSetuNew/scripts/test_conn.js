const { Client } = require('pg');

async function main() {
  const poolerRegions = [
    'aws-0-ap-northeast-1.pooler.supabase.com',
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-eu-west-1.pooler.supabase.com',
    'aws-0-us-west-1.pooler.supabase.com',
  ];
  const ports = [5432, 6543];
  const projectRef = 'fsdqlsbdbbfpqzvrptgk';
  const password = 'K#RAN@auraiya1';

  for (const host of poolerRegions) {
    for (const port of ports) {
      console.log(`Trying ${host}:${port}`);
      const client = new Client({
        host, port,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      try {
        await client.connect();
        const r = await client.query('SELECT current_user');
        console.log(`  ✓ SUCCESS with ${host}:${port} — user: ${r.rows[0].current_user}`);
        await client.end();
        return;
      } catch (e) {
        console.log(`  ✗ ${e.message}`);
        try { await client.end(); } catch (_) {}
      }
    }
  }
  console.error('All pooler regions failed');
  process.exit(1);
}

main().catch(e => { console.error(e.message); process.exit(1); });
