import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 py-2">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-pink rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-brand-pink/20 group-hover:rotate-6 transition-all duration-300">
              B
            </div>
            <div className="flex flex-col -gap-1">
              <span className="font-black text-xl tracking-tighter text-brand-dark uppercase leading-none">
                Back Pocket
              </span>
              <span className="font-bold text-lg text-brand-pink italic leading-none">
                Mysteries
              </span>
            </div>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8 text-xs font-black uppercase tracking-[0.15em] text-brand-dark/60">
            <Link href="/how-it-works" className="hover:text-brand-pink transition-all hover:scale-110">How it Works</Link>
            <Link href="/themes" className="hover:text-brand-pink transition-all hover:scale-110">Themes</Link>
            <Link href="/pricing" className="hover:text-brand-pink transition-all hover:scale-110">Pricing</Link>
            <Link href="/blog" className="hover:text-brand-pink transition-all hover:scale-110">Blog</Link>
          </nav>
          
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-xs font-black uppercase tracking-widest text-brand-dark/60 hover:text-brand-pink px-4 py-2 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="px-8 py-4 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/10 hover:shadow-brand-pink/20 hover:translate-y-[-2px] active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">{children}</main>
      
      <footer className="bg-brand-dark text-white py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-brand-pink rounded-xl flex items-center justify-center text-white font-black text-xl">
                  B
                </div>
                <div className="flex flex-col -gap-1">
                  <span className="font-black text-lg tracking-tighter text-white uppercase leading-none">
                    Back Pocket
                  </span>
                  <span className="font-bold text-sm text-brand-pink italic leading-none">
                    Mysteries
                  </span>
                </div>
              </Link>
              <p className="text-gray-400 leading-relaxed mb-8 font-medium">
                AI-generated murder mystery packs, fully personalised with your guest list. Print-ready in under 20 minutes. Part of the Back Pocket Games family.
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">Product</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link href="/themes" className="hover:text-brand-pink transition-colors">Themes</Link></li>
                <li><Link href="/how-it-works" className="hover:text-brand-pink transition-colors">How it Works</Link></li>
                <li><Link href="/pricing" className="hover:text-brand-pink transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">Company</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link href="/blog" className="hover:text-brand-pink transition-colors">Blog</Link></li>
                <li><Link href="/about" className="hover:text-brand-pink transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-brand-pink transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">Newsletter</h4>
              <p className="text-sm text-gray-400 mb-6 font-medium">New themes, hosting tips, and exclusive drops — straight to your inbox.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-brand-pink w-full" />
                <button className="bg-brand-pink p-3 rounded-full hover:bg-white hover:text-brand-pink transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black uppercase tracking-widest text-gray-500">
            <p>&copy; {new Date().getFullYear()} Back Pocket Games. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-brand-pink transition-colors">Twitter</a>
              <a href="#" className="hover:text-brand-pink transition-colors">Instagram</a>
              <a href="#" className="hover:text-brand-pink transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>

  );
}
