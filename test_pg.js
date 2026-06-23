import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});
await client.connect();
const res = await client.query("SELECT id, title FROM mysteries WHERE title ILIKE '%Love on the rocks%'");
console.log(res.rows);
await client.end();
