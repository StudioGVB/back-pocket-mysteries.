const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const token = env.match(/VERCEL_ACCESS_TOKEN="(.*?)"/)?.[1];

async function testVercelAPI() {
  const projectId = 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
  const teamId = 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

  const today = new Date();
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - 30);
  
  const params = new URLSearchParams({
    teamId,
    projectId,
    since: fromDate.toISOString(),
    until: today.toISOString(),
    environment: 'production',
    by: 'day'
  });

  const urls = [
    `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`
  ];

  for (const url of urls) {
    console.log('Fetching:', url);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Response body:', text.substring(0, 500));
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }
}

testVercelAPI();
