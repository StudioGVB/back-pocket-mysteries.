import { MetadataRoute } from 'next'
import { i18n } from '@/lib/i18n-config'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://backpocketmysteries.com'

export default function robots(): MetadataRoute.Robots {
  const locales = i18n.locales

  // All non-public / login / authenticated portal / internal tool paths
  const privatePaths = [
    '/login',
    '/signup',
    '/reset-password',
    '/auth',
    '/account',
    '/mysteries',
    '/admin',
    '/builder',
    '/play',
    '/create',
    '/checkout',
    '/invite',
    '/coming-soon',
  ]

  const localizedDisallowedPaths = privatePaths.flatMap((p) => [
    p,
    `${p}/`,
    ...locales.flatMap((locale) => [`/${locale}${p}`, `/${locale}${p}/`]),
  ])

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          ...locales.flatMap((locale) => [
            `/${locale}`,
            `/${locale}/custom-murder-mystery`,
            `/${locale}/themes`,
            `/${locale}/pricing`,
            `/${locale}/how-it-works`,
            `/${locale}/blog`,
            `/${locale}/faq`,
            `/${locale}/compare`,
            `/${locale}/reviews`,
            `/${locale}/contact`,
          ]),
        ],
        disallow: ['/api/', ...localizedDisallowedPaths],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
