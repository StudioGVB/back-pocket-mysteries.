const fs = require('fs');
const glob = require('glob');
const { execSync } = require('child_process');

const files = execSync('find src/app/\\[locale\\]/\\(marketing\\) -type f -name "*.tsx"').toString().trim().split('\n');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/getDictionary\(locale\)/g, "getDictionary(locale as Locale)");
  // Make sure it imports Locale
  if (!content.includes('import { Locale }')) {
    content = "import { Locale } from '@/lib/i18n-config';\n" + content;
  }
  fs.writeFileSync(file, content);
});
console.log("Fixed Locales");
