import { MetadataRoute } from 'next'
import { i18n } from '@/lib/i18n-config'
import { getPublishedBlogPosts } from '@/lib/blog-repository'
import { competitors } from '@/data/competitors'

import { getPublicMarketingMysteries } from '@/services/mysteries'
import { OCCASION_SEO_PAGES } from '@/data/occasion-seo-pages'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://backpocketmysteries.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = i18n.locales
  const lastModified = new Date()
  const changeFrequency = 'weekly' as const
  const [publishedBlogs, publicMysteries] = await Promise.all([
    getPublishedBlogPosts(),
    getPublicMarketingMysteries(),
  ])
  const themeSlugs = publicMysteries.map((m) => m.slug)

  // Base static paths
  const staticPaths = [
    '',
    '/custom-murder-mystery',
    '/play-online',
    '/free-murder-mystery-game',
    '/mini-mystery',
    '/themes',
    '/pricing',
    '/how-it-works',
    '/blog',
    '/faq',
    '/compare',
    '/reviews',
    '/contact',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/cookies'
  ]

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Add static paths
  staticPaths.forEach((path) => {
    locales.forEach((locale) => {
      const priority =
        path === ''
          ? 1.0
          : path === '/free-murder-mystery-game' ||
            path === '/custom-murder-mystery' ||
            path === '/play-online'
          ? 0.95
          : 0.85
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified,
        changeFrequency,
        priority
      })
    })
  })

  // Add occasion SEO landing pages
  OCCASION_SEO_PAGES.forEach((occ) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/occasions/${occ.slug}`,
        lastModified,
        changeFrequency,
        priority: 0.85
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
        priority: 0.85
      })
    })
  })

  // Add blog posts paths (excludes drafts and future-dated scheduled posts until publish_date <= now())
  publishedBlogs.forEach((post) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.publishDateIso || post.date),
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
