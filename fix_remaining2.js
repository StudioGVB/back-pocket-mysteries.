const fs = require('fs');

const marketingFiles = [
    'src/app/[locale]/(marketing)/layout.tsx',
    'src/app/[locale]/(marketing)/page.tsx',
    'src/app/[locale]/(marketing)/pricing/page.tsx',
    'src/app/[locale]/(marketing)/blog/actions.ts'
];

marketingFiles.forEach(f => {
    try {
        let c = fs.readFileSync(f, 'utf8');
        c = c.replace(/locale={locale}/g, "locale={locale as Locale}");
        if (!c.includes('import { Locale }') && c.includes('as Locale')) {
            c = "import { Locale } from '@/lib/i18n-config';\n" + c;
        }
        fs.writeFileSync(f, c);
    } catch {}
});

console.log("Fixed more");
