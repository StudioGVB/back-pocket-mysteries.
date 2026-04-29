const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Get all files recursively
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(srcDir, []);
const allFilesSet = new Set(allFiles.map(f => f.toLowerCase()));
const originalCaseMap = new Map();
allFiles.forEach(f => originalCaseMap.set(f.toLowerCase(), f));

let errorsFound = false;

allFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match imports like import { x } from './path' or import x from "../path"
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Ignore external modules and absolute aliases for now (though aliases could be wrong too)
    if (!importPath.startsWith('.')) {
      if (importPath.startsWith('@/')) {
        // Resolve alias
        const resolvedPath = path.join(__dirname, 'src', importPath.substring(2));
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        let found = false;
        let matchedActual = null;
        for (const ext of extensions) {
          const checkPath = resolvedPath + ext;
          if (fs.existsSync(checkPath)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
           // Case check
           for (const ext of extensions) {
             const lowerCheckPath = (resolvedPath + ext).toLowerCase();
             if (originalCaseMap.has(lowerCheckPath)) {
                console.error(`Case mismatch in ${file}:\n  Import: ${importPath}\n  Actual file: ${originalCaseMap.get(lowerCheckPath)}`);
                errorsFound = true;
                found = true;
                break;
             }
           }
        }
      }
      continue;
    }

    // Resolve relative path
    const dir = path.dirname(file);
    const resolvedPath = path.resolve(dir, importPath);
    
    // Check if it exists with extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '.css'];
    let found = false;
    
    for (const ext of extensions) {
      const checkPath = resolvedPath + ext;
      // Exact match
      if (fs.existsSync(checkPath)) {
        found = true;
        break;
      }
    }
    
    // If not found exactly, check case insensitive
    if (!found) {
      for (const ext of extensions) {
        const lowerCheckPath = (resolvedPath + ext).toLowerCase();
        if (originalCaseMap.has(lowerCheckPath)) {
          const actualPath = originalCaseMap.get(lowerCheckPath);
          console.error(`Case mismatch in ${file}:\n  Import: ${importPath}\n  Actual file: ${actualPath}`);
          errorsFound = true;
          break;
        }
      }
    }
  }
});

if (!errorsFound) console.log('No case-sensitive import mismatches found.');
