import { MetadataRoute } from 'next'
import { i18n } from '@/lib/i18n-config'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mysteries.backpocketgames.com'

export default function robots(): MetadataRoute.Robots {
  const locales = i18n.locales
  const privatePaths = ['/admin', '/builder', '/login', '/signup', '/reset-password']
  
  const disallowedPaths = privatePaths.flatMap(path => 
    locales.map(locale => `/${locale}${path}`)
  )

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', ...disallowedPaths],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
