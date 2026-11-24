'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LegalNav({ locale = 'en' }: { locale?: string }) {
  const pathname = usePathname() || '';

  const links = [
    { href: `/${locale}/privacy`, label: 'Privacy Policy' },
    { href: `/${locale}/terms`, label: 'Terms of Service' },
    { href: `/${locale}/refund-policy`, label: 'Refund & Cancellation Policy' },
    { href: `/${locale}/cookies`, label: 'Cookie Policy' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 pt-6">
      {links.map((item) => {
        const isActive = pathname === item.href || pathname.endsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 ${
              isActive
                ? 'bg-brand-dark text-white border-brand-dark shadow-[4px_4px_0px_#fe04c6]'
                : 'bg-white text-brand-dark border-gray-200 hover:border-brand-dark'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
