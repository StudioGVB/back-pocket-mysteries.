import React from 'react';
import { Metadata } from 'next';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { ContactForm } from '@/components/marketing/ContactForm';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `Contact Us | Back Pocket Mysteries`,
    description: "Get in touch with the Back Pocket Mysteries team.",
  };
}

export default async function ContactPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  return (
    <div className="bg-white">
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              Contact
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.95]">
              GET IN TOUCH.<br />
              <span className="text-brand-pink italic">WE'RE HERE TO HELP.</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
              Have a question about a mystery pack? Need help with an order? Drop us a line below or email us directly at <a href="mailto:Hello@backpocketgames.com" className="text-brand-pink hover:underline">Hello@backpocketgames.com</a>.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 lg:pb-32">
        <div className="max-w-3xl">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
