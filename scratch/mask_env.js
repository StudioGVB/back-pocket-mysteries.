const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1];
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    const masked = val.length > 10 ? val.substring(0, 10) + '...' + val.substring(val.length - 5) : val;
    console.log(`${key}: ${masked}`);
  }
});
