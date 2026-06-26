import { MetadataRoute } from 'next'
import { i18n } from '@/lib/i18n-config'
import { blogPosts } from '@/data/blog-posts'
import { competitors } from '@/data/competitors'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mysteries.backpocketgames.com'

const themeSlugs = [
  'love-on-the-rocks',
  'the-inheritance',
  'the-gala-heist',
  'dead-space',
  'speakeasy-scandal',
  'off-the-grid'
]

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = i18n.locales
  const lastModified = new Date()
  const changeFrequency = 'weekly' as const

  // Base static paths
  const staticPaths = [
    '',
    '/custom-murder-mystery',
    '/themes',
    '/pricing',
    '/how-it-works',
    '/blog',
    '/faq',
    '/compare',
    '/reviews',
    '/contact'
  ]

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Add static paths
  staticPaths.forEach((path) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified,
        changeFrequency,
        priority: path === '' ? 1.0 : 0.8
      })
    })
  })

  // Add theme details paths
  themeSlugs.forEach((slug) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/themes/${slug}`,
        lastModified,
        changeFrequency,
        priority: 0.8
      })
    })
  })

  // Add blog posts paths
  blogPosts.forEach((post) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency,
        priority: 0.7
      })
    })
  })

  // Add competitor comparison paths
  competitors.forEach((competitor) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/compare/${competitor.slug}`,
        lastModified,
        changeFrequency,
        priority: 0.6
      })
    })
  })

  return sitemapEntries
}
