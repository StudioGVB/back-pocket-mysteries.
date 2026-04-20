const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src/app/\\[locale\\]/\\(marketing\\) -type f -name "*.tsx"').toString().trim().split('\n');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/getDictionary\(locale\)/g, "getDictionary(locale as Locale)");
  if (!content.includes('import { Locale }') && content.includes('as Locale')) {
    content = "import { Locale } from '@/lib/i18n-config';\n" + content;
  }
  fs.writeFileSync(file, content);
});

// Also fix admin orders:
const ordersFile = 'src/app/[locale]/(service)/account/orders/page.tsx';
let ordersContent = fs.readFileSync(ordersFile, 'utf8');
ordersContent = ordersContent.replace(/const orders = \[/g, 'const orders: any[] = [');
fs.writeFileSync(ordersFile, ordersContent);

// Also fix characters motives error is_victim
const charPageFile = 'src/app/[locale]/(builder)/builder/mysteries/[id]/characters/page.tsx';
let charContent = fs.readFileSync(charPageFile, 'utf8');
charContent = charContent.replace(/is_victim: c\.is_victim,/g, 'is_victim: !!(c as any).is_victim,');
charContent = charContent.replace(/is_mandatory: c\.is_mandatory/g, 'is_mandatory: !!(c as any).is_mandatory');
fs.writeFileSync(charPageFile, charContent);

console.log("Fixed Locales and minor arrays");
