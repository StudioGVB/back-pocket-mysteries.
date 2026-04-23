import { MetadataRoute } from 'next'
import { i18n } from '@/lib/i18n-config'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mysteries.backpocketgames.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = i18n.locales
  const paths = ['', '/themes', '/pricing', '/how-it-works', '/blog', '/faq']
  
  const routes = paths.flatMap((path) => 
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    }))
  )

  return routes
}
