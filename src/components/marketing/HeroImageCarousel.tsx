'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const HERO_IMAGES = [
  { src: '/hero/01-vintage.png', label: 'Vintage 1920s' },
  { src: '/hero/02-boat.png', label: 'Luxury Yacht' },
  { src: '/hero/03-cabin.png', label: 'Cabin in the Woods' },
  { src: '/hero/04-reality.png', label: 'Reality TV Set' },
  { src: '/hero/05-masquerade.png', label: 'Masquerade Ball' },
];

interface HeroImageCarouselProps {
  alt: string;
}

export default function HeroImageCarousel({ alt }: HeroImageCarouselProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    let count = 0;
    
    // Add one image every 1.5 seconds
    const interval = setInterval(() => {
      count++;
      if (count > HERO_IMAGES.length + 1) {
        // Wait a bit, then reset the stack
        count = 0;
        setVisibleCount(0);
      } else {
        setVisibleCount(count);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Pre-generate some random rotations so they don't change on re-render
  const rotations = [
    '-rotate-2',
    'rotate-3',
    '-rotate-6',
    'rotate-1',
    '-rotate-3',
  ];

  return (
    <div className="relative w-[80%] h-[80%] flex items-center justify-center mx-auto my-auto">
      {HERO_IMAGES.map((img, index) => {
        // If the image hasn't dropped yet, hide it above the screen
        const isVisible = index < visibleCount;
        
        return (
          <div
            key={img.src}
            className={`absolute top-0 left-0 w-full h-full p-4 pb-16 bg-white shadow-2xl border border-gray-200 transition-all duration-700 ease-out
              ${isVisible ? `opacity-100 translate-y-0 scale-100 ${rotations[index]}` : 'opacity-0 -translate-y-20 scale-110'}`}
            style={{ zIndex: index }}
          >
            <div className="relative w-full h-full">
              <Image
                src={img.src}
                alt={`${alt} - ${img.label}`}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="font-[family-name:var(--font-caveat)] text-3xl sm:text-4xl text-gray-800">{img.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
