import React from 'react';
import Link from 'next/link';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-brand rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-blue/20 group-hover:scale-105 transition-transform duration-200">
              B
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-brand-pink transition-colors duration-200">
              Back Pocket <span className="text-brand-blue group-hover:text-slate-900 transition-colors duration-200 uppercase tracking-tight">Games</span>
            </span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-10 text-sm font-semibold text-slate-600">
            <Link href="/how-it-works" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">How it Works</Link>
            <Link href="/themes" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">Themes</Link>
            <Link href="/pricing" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">Pricing</Link>
            <Link href="/blog" className="hover:text-brand-pink transition-all hover:translate-y-[-1px]">Blog</Link>
          </nav>
          
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-brand-pink px-4 py-2 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="px-6 py-3 bg-brand-blue text-white rounded-full text-sm font-bold hover:bg-brand-pink transition-all duration-200 shadow-md hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[0px]">
              Get Started
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">{children}</main>
      
      <footer className="bg-slate-50 border-t border-slate-200 pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center text-white font-black text-sm">
                  B
                </div>
                <span className="font-bold text-lg text-slate-900 italic">Back Pocket Games</span>
              </Link>
              <p className="text-slate-500 leading-relaxed mb-6">
                Creating unforgettable, high-stakes mystery experiences for events of any size. Professional themes, personal touches.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Product</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-600">
                <li><Link href="/themes" className="hover:text-brand-pink transition-colors">Themes</Link></li>
                <li><Link href="/how-it-works" className="hover:text-brand-pink transition-colors">How it Works</Link></li>
                <li><Link href="/pricing" className="hover:text-brand-pink transition-colors">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Company</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-600">
                <li><Link href="/blog" className="hover:text-brand-pink transition-colors">Blog</Link></li>
                <li><Link href="/about" className="hover:text-brand-pink transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-brand-pink transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Legal</h4>
              <ul className="space-y-4 text-sm font-medium text-slate-600">
                <li><Link href="/terms" className="hover:text-brand-pink transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-brand-pink transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} Back Pocket Games. All rights reserved.</p>
            <div className="flex gap-6">
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
