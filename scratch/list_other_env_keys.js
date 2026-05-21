const fs = require('fs');
['.env.development.local', '.env.production'].forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`--- ${file} ---`);
    const envFile = fs.readFileSync(file, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        console.log(match[1]);
      }
    });
  }
});
