const fs = require('fs');

// ClueEditor
let f = 'src/app/[locale]/(builder)/builder/mysteries/[id]/clues/_components/ClueEditor.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/const statuses: EvidenceStatus\[\] = \['hidden', 'found', 'analyzed'\];/g, "const statuses: EvidenceStatus[] = ['real', 'fake', 'planted'];");
fs.writeFileSync(f, c);

// Clue actions
f = 'src/app/[locale]/(builder)/builder/mysteries/[id]/clues/actions.ts';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/evidence_status: 'hidden'/g, "evidence_status: 'real'");
fs.writeFileSync(f, c);

// Relationship matrix
f = 'src/app/[locale]/(builder)/builder/mysteries/[id]/relationships/_components/RelationshipMatrix.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/charA =>/g, "(charA: any) =>");
c = c.replace(/charB =>/g, "(charB: any) =>");
fs.writeFileSync(f, c);

