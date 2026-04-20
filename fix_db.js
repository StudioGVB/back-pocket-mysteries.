const fs = require('fs');
const content = fs.readFileSync('src/types/database.ts', 'utf8');

const tableUpdateRegex = /(Update:\s*\{[^}]*\})/g;
const newContent = content.replace(tableUpdateRegex, "$1\n        Relationships: any[]");

fs.writeFileSync('src/types/database.ts', newContent);
console.log("Injected Relationships");
