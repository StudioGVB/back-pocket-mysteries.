'use client';

import React from 'react';

import { AvatarConfig } from '@/utils/avatar';
export type { AvatarConfig };

interface AvatarBuilderProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  gender: string;
}

export function AvatarBuilder({ config, onChange, gender }: AvatarBuilderProps) {
  const updateConfig = (key: keyof AvatarConfig, value: string | undefined) => {
    onChange({ ...config, [key]: value });
  };

  const skinColors = [
    { hex: 'ffe0bd', label: 'Porcelain' },
    { hex: 'ffcd94', label: 'Fair' },
    { hex: 'eac086', label: 'Light' },
    { hex: 'd08b5b', label: 'Olive' },
    { hex: 'ae5d29', label: 'Light Brown' },
    { hex: '8d5524', label: 'Medium Brown' },
    { hex: '614335', label: 'Dark Brown' },
    { hex: '3b2219', label: 'Deep' }
  ];
  const hairColors = [
    { hex: '282828', label: 'Black' },
    { hex: '4a3123', label: 'Dark Brown' },
    { hex: 'a0785a', label: 'Light Brown' },
    { hex: 'a55728', label: 'Auburn' },
    { hex: 'c2a67e', label: 'Ash Blonde' },
    { hex: 'e8b07d', label: 'Strawberry Blonde' },
    { hex: 'd6b370', label: 'Golden Blonde' },
    { hex: 'f4f0e6', label: 'White Blonde' },
    { hex: 'd95319', label: 'Orange Red' },
    { hex: 'ca4444', label: 'Cherry Red' },
    { hex: 'e8e1e1', label: 'Silver / White' },
    { hex: 'f59797', label: 'Pastel Pink' },
    { hex: 'e84393', label: 'Hot Pink' },
    { hex: '4b0082', label: 'Indigo' },
    { hex: '00a8ff', label: 'Bright Blue' },
    { hex: '00b894', label: 'Mint Green' }
  ];
  
  const hairLengths = [
    { id: 'Bald', label: 'Bald' },
    { id: 'Short', label: 'Short' },
    { id: 'Medium', label: 'Medium' },
    { id: 'Shoulder-Length', label: 'Shoulder-Length' },
    { id: 'Long', label: 'Long' },
    { id: 'Very Long', label: 'Very Long' },
    { id: 'Hijab', label: 'Hijab' },
    { id: 'Turban', label: 'Turban' },
    { id: 'Beanie', label: 'Beanie' }
  ];

  const hairTextures = [
    { id: 'Straight', label: 'Straight' },
    { id: 'Small Waves', label: 'Small Waves' },
    { id: 'Wavy', label: 'Wavy' },
    { id: 'Curly', label: 'Curly' },
    { id: 'Very Curly', label: 'Very Curly' },
    { id: 'Coily', label: 'Coily' },
    { id: 'Dreads', label: 'Dreads' },
    { id: 'Afro', label: 'Afro' }
  ];

  const deriveDiceBearTop = (length?: string, texture?: string, g?: string) => {
    if (!length || length === 'Bald') return 'none';
    if (length === 'Hijab') return 'hijab';
    if (length === 'Turban') return 'turban';
    if (length === 'Beanie') return 'winterHat1';
    
    if (g === 'Masculine') {
      if (length === 'Short') {
        if (texture === 'Curly' || texture === 'Very Curly' || texture === 'Coily') return 'shortCurly';
        if (texture === 'Afro') return 'frizzle';
        if (texture === 'Dreads') return 'dreads01';
        if (texture === 'Wavy' || texture === 'Small Waves') return 'shortWaved';
        return 'shortFlat';
      }
      if (length === 'Medium' || length === 'Shoulder-Length') {
        if (texture === 'Curly' || texture === 'Wavy' || texture === 'Small Waves') return 'curvy';
        if (texture === 'Afro') return 'frizzle';
        return 'shaggyMullet'; 
      }
      if (length === 'Long' || length === 'Very Long') {
        if (texture === 'Dreads') return 'dreads01';
        return 'straightAndStrand';
      }
      return 'shortFlat';
    } else {
      if (length === 'Short') {
        if (texture === 'Curly' || texture === 'Very Curly' || texture === 'Coily') return 'curly';
        if (texture === 'Afro') return 'frizzle';
        if (texture === 'Dreads') return 'dreads01';
        return 'miaWallace';
      }
      if (length === 'Medium' || length === 'Shoulder-Length') {
        if (texture === 'Curly' || texture === 'Very Curly' || texture === 'Coily') return 'curly';
        if (texture === 'Wavy' || texture === 'Small Waves') return 'curvy';
        if (texture === 'Afro') return 'frizzle';
        if (texture === 'Dreads') return 'dreads01';
        return 'bob';
      }
      if (length === 'Long' || length === 'Very Long') {
        if (texture === 'Curly' || texture === 'Very Curly' || texture === 'Coily') return 'curly';
        if (texture === 'Wavy' || texture === 'Small Waves') return 'curvy';
        if (texture === 'Afro') return 'frizzle';
        if (texture === 'Dreads') return 'dreads01';
        return 'straight01';
      }
      return 'straight01';
    }
  };

  const updateHair = (length?: string, texture?: string) => {
    const l = length !== undefined ? length : config.hairLength;
    const t = texture !== undefined ? texture : (config.hairTexture || 'Straight');
    const top = deriveDiceBearTop(l, t, gender);
    onChange({ ...config, hairLength: l, hairTexture: t, top });
  };

  const facialHairOptions = [
    { id: undefined, label: 'None' },
    { id: 'beardLight', label: 'Light Beard' },
    { id: 'beardMedium', label: 'Medium Beard' },
    { id: 'beardMajestic', label: 'Majestic Beard' },
    { id: 'moustacheFancy', label: 'Fancy Stache' },
    { id: 'moustacheMagnum', label: 'Magnum Stache' },
  ];

  const eyeColors = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Heterochromia'];
  const heights = ['Petite / Short', 'Average', 'Tall', 'Very Tall'];



  const builds = ['Slender', 'Athletic', 'Average', 'Curvy', 'Heavy-set', 'Broad-shouldered'];
  const distinctiveFeaturesOptions = ['Freckles', 'Beauty Mark', 'Glasses'];

  const toggleDistinctiveFeature = (feature: string) => {
    const current = config.distinctiveFeatures || [];
    if (current.includes(feature)) {
      onChange({ ...config, distinctiveFeatures: current.filter(f => f !== feature) });
    } else {
      onChange({ ...config, distinctiveFeatures: [...current, feature] });
    }
  };

  let currentLength = config.hairLength;
  if (!currentLength) {
    if (!config.top || config.top === 'none') {
      currentLength = 'Bald';
    } else {
      currentLength = 'Medium';
    }
  }

  return (
    <div className="space-y-8">
      {/* Skin Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Skin Tone</label>
        <div className="flex flex-wrap gap-4">
          {skinColors.map(color => (
            <div key={color.hex} className="flex flex-col items-center gap-1.5 w-14">
              <button
                onClick={() => updateConfig('skinColor', color.hex)}
                className={`w-10 h-10 rounded-full border-2 transition-all shrink-0 ${
                  config.skinColor === color.hex ? 'border-brand-pink scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: `#${color.hex}` }}
                aria-label={`Skin color ${color.label}`}
              />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-tight">{color.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hair Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Color</label>
        <div className="flex flex-wrap gap-4">
          {hairColors.map(color => (
            <div key={color.hex} className="flex flex-col items-center gap-1.5 w-14">
              <button
                onClick={() => updateConfig('hairColor', color.hex)}
                className={`w-10 h-10 rounded-full border-2 transition-all shrink-0 ${
                  config.hairColor === color.hex ? 'border-brand-pink scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: `#${color.hex}` }}
                aria-label={`Hair color ${color.label}`}
              />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center leading-tight">{color.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hair Length & Headwear */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Length & Headwear</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {hairLengths.map(style => (
            <button
              key={style.id}
              onClick={() => updateHair(style.id, undefined)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                currentLength === style.id 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Texture */}
      {currentLength !== 'Bald' && !['Hijab', 'Turban', 'Beanie'].includes(currentLength) && (
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Texture</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hairTextures.map(style => (
              <button
                key={style.id}
                onClick={() => updateHair(undefined, style.id)}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                  (config.hairTexture || 'Straight') === style.id 
                    ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Facial Hair (Only for Masculine) */}
      {gender === 'Masculine' && (
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Facial Hair</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {facialHairOptions.map(style => (
              <button
                key={style.id || 'none'}
                onClick={() => updateConfig('facialHair', style.id)}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                  config.facialHair === style.id 
                    ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Eye Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Eye Color (Metadata)</label>
        <div className="grid grid-cols-3 gap-3">
          {eyeColors.map(color => (
            <button
              key={color}
              onClick={() => updateConfig('eyeColor', color)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                config.eyeColor === color 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic">* Eye color will be used in the story, but isn't visible on this avatar style.</p>
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Height</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {heights.map(height => (
            <button
              key={height}
              onClick={() => updateConfig('height', height)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                config.height === height 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {height}
            </button>
          ))}
        </div>
      </div>

      {/* Body Build */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Body Build (AI Rendering Only)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {builds.map(build => (
            <button
              key={build}
              onClick={() => updateConfig('build', build)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                config.build === build 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {build}
            </button>
          ))}
        </div>
      </div>

      {/* Distinctive Features */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Distinctive Features (AI Rendering Only)</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {distinctiveFeaturesOptions.map(feature => {
            const isSelected = (config.distinctiveFeatures || []).includes(feature);
            return (
              <button
                key={feature}
                onClick={() => toggleDistinctiveFeature(feature)}
                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                  isSelected 
                    ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {feature}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
