const fs = require('fs');
const content = fs.readFileSync('src/types/database.ts', 'utf8');

const tableUpdateRegex = /(Update:\s*\{[^}]*\})(\n\s*Relationships:\s*any\[\])?/g;
const relationshipString = `
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]`;

const newContent = content.replace(tableUpdateRegex, (match, p1) => {
    return p1 + relationshipString;
});

fs.writeFileSync('src/types/database.ts', newContent);
console.log("Injected Strict Relationships Type");
