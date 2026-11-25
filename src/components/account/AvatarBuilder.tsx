'use client';

import React from 'react';

import { AvatarConfig } from '@/utils/avatar';
export type { AvatarConfig };

interface AvatarBuilderProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  gender: string;
}

export const deriveDiceBearTop = (length?: string, texture?: string, g?: string) => {
  if (!length || length === 'Bald') return 'none';
  if (length === 'Hijab') return 'hijab';
  if (length === 'Turban') return 'turban';
  if (length === 'Beanie') return 'winterHat1';
  if (length === 'Baseball Cap') return 'hat';

  if (length === 'Buzz / Crew Cut') {
    return 'theCaesar';
  }
  
  if (g === 'Masculine') {
    if (length === 'Short') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly') return 'shortCurly';
      if (texture === 'Coily' || texture === 'Afro') return 'frizzle';
      if (texture === 'Dreads') return 'dreads01';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'shortWaved';
      return 'shortFlat';
    }
    if (length === 'Medium') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Coily') return 'shortCurly';
      if (texture === 'Afro') return 'fro';
      if (texture === 'Dreads') return 'dreads02';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'shortWaved';
      return 'shortRound';
    }
    if (length === 'Shoulder-Length') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Coily') return 'shaggy';
      if (texture === 'Afro') return 'fro';
      if (texture === 'Dreads') return 'dreads02';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'shaggy';
      return 'shaggyMullet';
    }
    if (length === 'Long' || length === 'Very Long') {
      if (texture === 'Dreads') return 'dreads';
      if (texture === 'Afro' || texture === 'Coily') return 'fro';
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Wavy' || texture === 'Small Waves') return 'shaggyMullet';
      return 'longButNotTooLong';
    }
    return 'shortFlat';
  } else {
    if (length === 'Short') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Coily') return 'shortCurly';
      if (texture === 'Afro') return 'frizzle';
      if (texture === 'Dreads') return 'dreads01';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'shortWaved';
      return 'miaWallace';
    }
    if (length === 'Medium' || length === 'Shoulder-Length') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Coily') return 'curly';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'curvy';
      if (texture === 'Afro') return 'fro';
      if (texture === 'Dreads') return 'dreads';
      return 'bob';
    }
    if (length === 'Long' || length === 'Very Long') {
      if (texture === 'Curly' || texture === 'Loose Curls' || texture === 'Very Curly' || texture === 'Coily') return 'curly';
      if (texture === 'Wavy' || texture === 'Small Waves') return 'curvy';
      if (texture === 'Afro') return 'fro';
      if (texture === 'Dreads') return 'dreads';
      return 'straight01';
    }
    return 'straight01';
  }
};

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
    { id: 'Buzz / Crew Cut', label: 'Buzz / Crew Cut' },
    { id: 'Short', label: 'Short (Full Top)' },
    { id: 'Medium', label: 'Medium' },
    { id: 'Shoulder-Length', label: 'Shoulder-Length' },
    { id: 'Long', label: 'Long' },
    { id: 'Very Long', label: 'Very Long' },
    { id: 'Hijab', label: 'Hijab' },
    { id: 'Turban', label: 'Turban' },
    { id: 'Beanie', label: 'Beanie' },
    { id: 'Baseball Cap', label: 'Baseball Cap' },
  ];

  const hairTextures = [
    { id: 'Straight', label: 'Straight' },
    { id: 'Small Waves', label: 'Small Waves' },
    { id: 'Wavy', label: 'Wavy' },
    { id: 'Loose Curls', label: 'Loose Curls' },
    { id: 'Curly', label: 'Curly' },
    { id: 'Very Curly', label: 'Tight / Very Curly' },
    { id: 'Coily', label: 'Coily' },
    { id: 'Dreads', label: 'Dreads / Locs' },
    { id: 'Afro', label: 'Afro' }
  ];

  const hairStyleCuts = [
    { id: 'Textured Crop / Curly Fringe', label: 'Textured Crop / Curly Fringe' },
    { id: 'Taper Fade / Voluminous Top', label: 'Taper Fade + Full Top' },
    { id: 'Natural / Classic', label: 'Natural / Classic' },
    { id: 'Middle Part / Curtain Fringe', label: 'Middle Part / Curtain Fringe' },
    { id: 'Side Part / Swept', label: 'Side Part / Swept' },
    { id: 'Quiff / Pompadour', label: 'Quiff / Brushed Up' },
    { id: 'Slicked Back', label: 'Slicked Back' },
    { id: 'Modern Mullet / Shag', label: 'Modern Mullet / Shag' },
    { id: 'Bangs / Full Fringe', label: 'Bangs / Forehead Fringe' },
    { id: 'Layered Blowout', label: 'Layered / Voluminous Blowout' },
    { id: 'High Ponytail / Bun', label: 'Ponytail / Updo / Bun' },
    { id: 'Braids / Cornrows', label: 'Braids / Cornrows' },
  ];

  let currentLength = config.hairLength;
  if (!currentLength) {
    if (!config.top || config.top === 'none') {
      currentLength = 'Bald';
    } else if (config.top === 'theCaesar') {
      currentLength = 'Buzz / Crew Cut';
    } else if (['shortFlat', 'shortCurly', 'shortWaved', 'miaWallace'].includes(config.top)) {
      currentLength = 'Short';
    } else if (['straight01', 'straight02', 'straightAndStrand'].includes(config.top)) {
      currentLength = 'Long';
    } else {
      currentLength = 'Medium';
    }
  }

  const updateHair = (length?: string, texture?: string) => {
    const l = length !== undefined ? length : currentLength;
    const t = texture !== undefined ? texture : (config.hairTexture || 'Straight');
    const top = deriveDiceBearTop(l, t, gender);
    onChange({ ...config, hairLength: l, hairTexture: t, top });
  };

  const facialHairOptions = [
    { id: undefined, label: 'None (Clean-Shaven)' },
    { id: 'stubbleLight', label: 'Light Stubble' },
    { id: 'beardLight', label: 'Short Trimmed Beard' },
    { id: 'beardMedium', label: 'Full Medium Beard' },
    { id: 'beardMajestic', label: 'Long Majestic Beard' },
    { id: 'moustacheFancy', label: 'Fancy Mustache' },
    { id: 'moustacheMagnum', label: 'Thick Mustache' },
    { id: 'goatee', label: 'Goatee' },
  ];

  const eyeColors = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Heterochromia'];
  const faceShapes = [
    'Square / Angular Jaw',
    'Oval / Balanced',
    'Chiseled / High Cheekbones',
    'Round / Soft Jaw',
    'Heart-Shaped / Tapered Chin',
    'Long / Sculpted',
  ];
  const heights = ['Petite / Short', 'Average', 'Tall', 'Very Tall'];

  const builds = ['Slender', 'Athletic', 'Average', 'Curvy', 'Heavy-set', 'Broad-shouldered'];
  const distinctiveFeaturesOptions = [
    'Thick / Dark Eyebrows',
    'Cleft / Dimpled Chin',
    'Cheek Dimples',
    'Freckles',
    'Beauty Mark',
    'Glasses',
    'Sun-Kissed Tan',
    'Earrings / Piercings',
  ];

  const toggleDistinctiveFeature = (feature: string) => {
    const current = config.distinctiveFeatures || [];
    if (current.includes(feature)) {
      onChange({ ...config, distinctiveFeatures: current.filter(f => f !== feature) });
    } else {
      onChange({ ...config, distinctiveFeatures: [...current, feature] });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Skin Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Skin Tone</label>
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-items-center sm:justify-start">
          {skinColors.map(color => (
            <div key={color.hex} className="flex flex-col items-center gap-1.5 w-14">
              <button
                type="button"
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
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-items-center sm:justify-start">
          {hairColors.map(color => (
            <div key={color.hex} className="flex flex-col items-center gap-1.5 w-14">
              <button
                type="button"
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
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Length &amp; Headwear</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {hairLengths.map(style => (
            <button
              key={style.id}
              type="button"
              onClick={() => updateHair(style.id, undefined)}
              className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
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
      {currentLength !== 'Bald' && !['Hijab', 'Turban', 'Beanie', 'Baseball Cap'].includes(currentLength) && (
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Texture</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {hairTextures.map(style => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateHair(undefined, style.id)}
                className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
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

      {/* Hair Style & Cut */}
      {currentLength !== 'Bald' && !['Hijab', 'Turban', 'Beanie', 'Baseball Cap'].includes(currentLength) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
              Hair Style &amp; Cut (How It Sits)
            </label>
            <span className="text-[10px] font-bold text-brand-pink">
              ✨ Shapes AI Portrait Hair
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {hairStyleCuts.map(cut => {
              const isSelected = (config.hairStyle || 'Natural / Classic') === cut.id;
              return (
                <button
                  key={cut.id}
                  type="button"
                  onClick={() => updateConfig('hairStyle', cut.id)}
                  className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
                    isSelected
                      ? 'border-brand-pink bg-brand-pink/5 text-brand-pink'
                      : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cut.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Facial Hair (For Masculine & Neutral) */}
      {gender !== 'Feminine' && (
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Facial Hair</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {facialHairOptions.map(style => (
              <button
                key={style.id || 'none'}
                type="button"
                onClick={() => updateConfig('facialHair', style.id)}
                className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
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
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Eye Color</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {eyeColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => updateConfig('eyeColor', color)}
              className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 truncate ${
                config.eyeColor === color 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Face Shape & Jawline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
            Face Shape &amp; Jawline
          </label>
          <span className="text-[10px] font-bold text-slate-400">
            AI Likeness
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {faceShapes.map(shape => (
            <button
              key={shape}
              type="button"
              onClick={() =>
                updateConfig('faceShape', config.faceShape === shape ? undefined : shape)
              }
              className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
                config.faceShape === shape
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink'
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>

      {/* Distinctive Features */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          Distinctive Facial Features (Select Any That Apply)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {distinctiveFeaturesOptions.map(feature => {
            const isSelected = (config.distinctiveFeatures || []).includes(feature);
            return (
              <button
                key={feature}
                type="button"
                onClick={() => toggleDistinctiveFeature(feature)}
                className={`py-2.5 sm:py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
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

      {/* Height */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Height</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {heights.map(height => (
            <button
              key={height}
              type="button"
              onClick={() => updateConfig('height', height)}
              className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 ${
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
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Body Build</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {builds.map(build => (
            <button
              key={build}
              type="button"
              onClick={() => updateConfig('build', build)}
              className={`py-2.5 sm:py-3 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border-2 truncate ${
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

      {/* Specific Hair & Facial Likeness Notes (Auto-filled by Photo Scan or Custom) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
            Specific Hair &amp; Facial Likeness Notes (Optional)
          </label>
          <span className="text-[10px] font-bold text-brand-pink">
            ✨ Highest-Priority AI Portrait Guide
          </span>
        </div>
        <textarea
          rows={2}
          value={config.likenessNotes || ''}
          onChange={(e) => updateConfig('likenessNotes', e.target.value || undefined)}
          placeholder="e.g. Thick jet-black curly hair falling in a textured crop onto the upper forehead with neat tapered sides, bold dark straight eyebrows, square jawline with a slight chin dimple"
          className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 outline-none transition-all resize-none"
        />
        <p className="text-[10px] text-slate-400 mt-1.5">
          Auto-filled when you upload a photo above, or describe their exact haircut &amp; features in your own words so the AI portrait looks just like them.
        </p>
      </div>
    </div>
  );
}
