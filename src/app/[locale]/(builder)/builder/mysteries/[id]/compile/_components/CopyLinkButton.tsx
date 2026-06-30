"use client";

import React, { useState } from 'react';

interface CopyLinkButtonProps {
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const absoluteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${url}`
        : url;
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
        copied
          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
          : 'bg-[#FF1493] hover:bg-[#FF3366] text-white shadow-brand-pink/20'
      }`}
    >
      {copied ? (
        <>
          <span>Copied!</span>
          <span>✓</span>
        </>
      ) : (
        <>
          <span>Copy Guest Pass Link</span>
          <span>🔗</span>
        </>
      )}
    </button>
  );
}
