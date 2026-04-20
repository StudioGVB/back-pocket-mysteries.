import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { blogPosts } from '@/data/blog-posts';
import { NewsletterForm } from '@/components/marketing/NewsletterForm';

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale);
  
  return {
    title: `${dict.common.blog} | ${dict.common.siteTitle}`,
    description: dict.blog.subtitle,
  };
}

export default async function BlogPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale);

  const featuredPost = blogPosts[0]; // First post as featured
  const otherPosts = blogPosts.slice(1);

  return (
    <div className="py-24 lg:py-48 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            {dict.blog.badge}
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-brand-dark mb-10 tracking-tighter uppercase leading-[0.9]">
            {dict.blog.title.split(',').map((part, i) => (
              <React.Fragment key={i}>
                {part}
                {i === 0 && <br />}
                {i === 1 && <span className="text-brand-pink italic">{part}</span>}
              </React.Fragment>
            ))}
          </h1>
          <p className="text-xl lg:text-2xl text-gray-500 font-bold max-w-xl mx-auto border-l-4 border-brand-pink pl-6 text-left leading-relaxed">
            {dict.blog.subtitle}
          </p>
        </div>

        {/* Featured Post */}
        <div className="mb-32">
          <Link href={`/${locale}/blog/${featuredPost.slug}`} className="group block relative bg-brand-dark rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white hover:scale-[1.01] transition-all duration-500">
            <div className="flex flex-col lg:flex-row min-h-[600px]">
              <div className="lg:flex-1 relative overflow-hidden aspect-video lg:aspect-auto">
                <Image 
                  src={featuredPost.image} 
                  alt={featuredPost.title} 
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 group-hover:opacity-100"
                />
              </div>
              <div className="lg:flex-1 p-16 lg:p-24 flex flex-col justify-center bg-brand-dark relative z-10">
                <span className="inline-block px-4 py-1.5 bg-brand-pink text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8 w-fit">
                  {dict.blog.featured.badge}
                </span>
                <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 group-hover:text-brand-pink transition-colors uppercase tracking-tighter leading-[0.9]">
                   {featuredPost.title}
                </h2>
                <p className="text-gray-400 text-lg mb-10 leading-relaxed font-bold">
                  {featuredPost.excerpt}
                </p>
                <div className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-4 group/link">
                  {dict.blog.featured.cta}
                  <span className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover/link:bg-brand-pink group-hover/link:border-brand-pink transition-all">
                     →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {otherPosts.map((post, i) => (
            <Link href={`/${locale}/blog/${post.slug}`} key={i} className="group flex flex-col">
              <div className="card-branded p-12 flex flex-col h-full hover:border-brand-pink transition-all">
                <div className="aspect-video bg-brand-gray rounded-[2rem] mb-10 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                  <Image 
                    src={post.image} 
                    alt={post.title} 
                    fill 
                    className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent"></div>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">{post.tag}</span>
                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{post.date}</span>
                </div>
                <h3 className="text-3xl font-black text-brand-dark mb-6 group-hover:text-brand-pink transition-colors uppercase tracking-tighter leading-none">
                  {post.title}
                </h3>
                <p className="text-gray-500 font-bold leading-relaxed mb-10 flex-grow text-lg line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="text-xs font-black uppercase tracking-widest text-brand-dark group-hover:text-brand-pink transition-colors flex items-center gap-2">
                  Keep Reading <span className="text-xl transition-transform group-hover:translate-x-1">+</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Newsletter CTA */}
        <div className="mt-64 bg-brand-dark rounded-[4rem] p-16 lg:p-32 relative overflow-hidden text-center shadow-2xl border-8 border-white group">
          <div className="relative z-10 max-w-xl mx-auto">
            <h2 className="text-5xl lg:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">
               {dict.blog.newsletter.title.split(',').map((part, i) => (
                 <React.Fragment key={i}>
                   {part}
                   {i === 0 && <br />}
                   {i === 1 && <span className="text-brand-pink italic">{part}</span>}
                 </React.Fragment>
               ))}
            </h2>
            <p className="text-gray-400 text-xl lg:text-2xl mb-12 font-bold leading-snug">{dict.blog.newsletter.desc}</p>
            <NewsletterForm 
              placeholder={dict.blog.newsletter.placeholder}
              buttonText={dict.blog.newsletter.button}
              namePlaceholder="Your full name"
            />
          </div>
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.2)_1px,transparent_1px)] [background-size:32px_32px]"></div>
             <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-pink rounded-full blur-[120px] opacity-20 group-hover:scale-150 transition-transform duration-1000"></div>
          </div>
        </div>
      </div>
    </div>
  );
}


