import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { blogPosts } from '@/data/blog-posts';
import { NewsletterForm } from '@/components/marketing/NewsletterForm';

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(props: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const post = blogPosts.find((p) => p.slug === params.slug);
  
  if (!post) return {};
  
  return {
    title: `${post.seo.title} | Back Pocket Mysteries`,
    description: post.seo.description,
    keywords: post.seo.keywords,
    openGraph: {
      title: post.seo.title,
      description: post.seo.description,
      images: [post.image],
      type: 'article',
    }
  };
}

export default async function BlogPostPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const post = blogPosts.find((p) => p.slug === params.slug);
  const dict = await getDictionary(locale as Locale);

  if (!post) {
    notFound();
  }

  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] lg:h-[80vh] overflow-hidden">
        <Image 
          src={post.image} 
          alt={post.title} 
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/40 to-transparent"></div>
        
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-6 pb-20 lg:pb-32">
            <div className="max-w-4xl">
              <Link 
                href={`/${locale}/blog`}
                className="inline-flex items-center gap-2 text-brand-pink font-black uppercase tracking-[0.2em] text-[10px] mb-8 hover:gap-4 transition-all"
              >
                ← Back to Gazette
              </Link>
              <div className="flex items-center gap-4 mb-6">
                <span className="px-4 py-1 bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                  {post.tag}
                </span>
                <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                  {post.date} • {post.readTime}
                </span>
              </div>
              <h1 className="text-5xl lg:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9] uppercase">
                {post.title}
              </h1>
              <p className="text-xl lg:text-2xl text-gray-300 font-bold max-w-2xl leading-relaxed">
                {post.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 lg:gap-24">
            {/* Main Content */}
            <div className="lg:col-span-8">
              <article 
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: post.content }} 
              />
              
              {/* Author Bio */}
              <div className="mt-20 p-12 bg-brand-gray rounded-[3rem] border-2 border-gray-100 flex flex-col sm:flex-row items-center gap-10">
                <div className="w-24 h-24 bg-brand-pink rounded-full flex items-center justify-center text-white text-3xl font-black uppercase shrink-0">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-2">Written by {post.author.name}</h4>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-4">{post.author.role}</p>
                  <p className="text-gray-500 font-semibold leading-relaxed">
                    Bringing immersive storytelling to the modern host. Specialist in twisting plots and high-stakes drama.
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-12">
              <div className="sticky top-32 space-y-8">
                {/* Product CTA Card */}
                <div className="bg-brand-dark rounded-[3rem] p-10 text-white overflow-hidden relative shadow-2xl group border-4 border-white">
                  <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-brand-pink text-[9px] font-black uppercase tracking-widest rounded-full mb-6 italic">Featured Theme</span>
                    <h4 className="text-3xl font-black mb-4 uppercase tracking-tighter leading-none">
                      Love on <br />
                      <span className="text-brand-pink italic">The Rocks</span>
                    </h4>
                    <p className="text-gray-400 text-sm font-bold mb-8 leading-relaxed">
                      Toxic exes, secret affairs, and a suspicious death at a hen weekend. Perfect for your next party.
                    </p>
                    <Link href={`/${locale}/themes/love-on-the-rocks`} className="w-full py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-[10px] text-center block hover:bg-white hover:text-brand-pink transition-all shadow-xl">
                      Build your mystery
                    </Link>
                  </div>
                </div>

                {/* Newsletter Card */}
                <div className="card-branded p-10 bg-brand-gray border-2 border-gray-100">
                  <h4 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-4">The Gazette Newsletter</h4>
                  <p className="text-sm text-gray-500 font-bold mb-8 leading-relaxed">Never miss a theme or a tip. Get our best hosting secrets delivered weekly.</p>
                  <NewsletterForm 
                    placeholder="Your email"
                    buttonText="Join the loop"
                    isSidebar={true}
                  />
                </div>

                {/* Social Share */}
                <div className="flex items-center justify-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Share:</span>
                  <div className="flex gap-4">
                    {['X', 'In', 'Fb'].map((s) => (
                      <button key={s} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[10px] font-black hover:bg-brand-pink hover:text-white hover:border-brand-pink transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Recommended Posts */}
      <section className="py-24 bg-brand-gray">
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl lg:text-6xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-4">
                Keep <span className="text-brand-pink italic">Reading</span>
              </h2>
              <p className="text-gray-400 font-black uppercase tracking-[0.15em] text-[10px]">More stories from the world of mystery</p>
            </div>
            <Link href={`/${locale}/blog`} className="text-xs font-black uppercase tracking-widest text-brand-pink hover:text-brand-dark transition-colors">
              View all posts
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {relatedPosts.map((post, i) => (
              <Link href={`/${locale}/blog/${post.slug}`} key={i} className="group flex flex-col lg:flex-row bg-white rounded-[2.5rem] overflow-hidden border-2 border-transparent hover:border-brand-pink transition-all shadow-lg">
                <div className="lg:w-1/3 aspect-video lg:aspect-auto relative overflow-hidden">
                  <Image 
                    src={post.image} 
                    alt={post.title} 
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-8 lg:p-10 flex flex-col justify-center lg:w-2/3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink mb-4">{post.tag}</span>
                  <h3 className="text-2xl font-black text-brand-dark mb-4 group-hover:text-brand-pink transition-colors uppercase tracking-tight leading-none">
                    {post.title}
                  </h3>
                  <div className="mt-auto flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
