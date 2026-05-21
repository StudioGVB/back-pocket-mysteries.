'use client';

import React from 'react';

export type AvatarConfig = {
  seed: string;
  top: string;
  hairColor: string;
  skinColor: string;
  facialHair?: string;
  eyeColor?: string;
  height?: string;
  accessories?: string;
};

export function buildAvatarUrl(config: AvatarConfig | any, name?: string) {
  if (!config) return null;
  const isBald = config.top === 'none';
  const hasAccessories = config.accessories && config.accessories !== 'none';
  
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent` +
    `${isBald ? '&topProbability=0' : `&top=${config.top}`}` +
    `&hairColor=${config.hairColor}&hatColor=${config.hairColor}&skinColor=${config.skinColor}` +
    `&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}&facialHairColor=${config.hairColor}` : ''}` +
    `&accessoriesProbability=${hasAccessories ? '100' : '0'}${hasAccessories ? `&accessories=${config.accessories}` : ''}`;
}

interface AvatarBuilderProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  gender: string;
}

export function AvatarBuilder({ config, onChange, gender }: AvatarBuilderProps) {
  const updateConfig = (key: keyof AvatarConfig, value: string | undefined) => {
    onChange({ ...config, [key]: value });
  };

  const skinColors = ['ffe0bd', 'ffcd94', 'eac086', 'd08b5b', 'ae5d29', '8d5524', '614335', '3b2219'];
  // Natural + 5 Crazy Colors
  const hairColors = ['282828', '4a3123', 'a55728', 'd6b370', 'f59797', 'e8e1e1', 'ca4444', '4b0082', '00a8ff', 'e84393', '00b894'];
  
  const masculineTops = [
    { id: 'none', label: 'Bald' },
    { id: 'shortFlat', label: 'Short Flat' },
    { id: 'shortWaved', label: 'Short Waved' },
    { id: 'curvy', label: 'Wavy' },
    { id: 'dreads01', label: 'Dreads' },
    { id: 'frizzle', label: 'Frizzle' },
    { id: 'theCaesar', label: 'Caesar' },
    { id: 'shortRound', label: 'Round' },
    { id: 'shavedSides', label: 'Shaved Sides' },
    { id: 'bun', label: 'Man Bun' },
    { id: 'longButNotTooLong', label: 'Medium Long' },
    { id: 'shaggyMullet', label: 'Mullet' },
    { id: 'straightAndStrand', label: 'Long & Messy' },
    { id: 'turban', label: 'Turban' },
    { id: 'winterHat1', label: 'Beanie' },
  ];

  const feminineTops = [
    { id: 'none', label: 'Bald' },
    { id: 'straight01', label: 'Long Straight' },
    { id: 'curvy', label: 'Wavy' },
    { id: 'bob', label: 'Bob' },
    { id: 'curly', label: 'Curly' },
    { id: 'frida', label: 'Floral' },
    { id: 'longButNotTooLong', label: 'Medium' },
    { id: 'miaWallace', label: 'Straight Bob' },
    { id: 'hijab', label: 'Hijab' },
    { id: 'turban', label: 'Turban' },
    { id: 'winterHat1', label: 'Beanie' },
  ];

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

  const accessoryOptions = [
    { id: 'none', label: 'None' },
    { id: 'kurt', label: 'Kurt Glasses' },
    { id: 'prescription01', label: 'Prescription 1' },
    { id: 'prescription02', label: 'Prescription 2' },
    { id: 'round', label: 'Round Glasses' },
    { id: 'sunglasses', label: 'Sunglasses' },
    { id: 'wayfarers', label: 'Wayfarers' },
  ];

  const tops = gender === 'Masculine' ? masculineTops : feminineTops;

  return (
    <div className="space-y-8">
      {/* Skin Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Skin Tone</label>
        <div className="flex flex-wrap gap-3">
          {skinColors.map(color => (
            <button
              key={color}
              onClick={() => updateConfig('skinColor', color)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                config.skinColor === color ? 'border-brand-pink scale-110 shadow-lg' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: `#${color}` }}
              aria-label={`Skin color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Hair Color */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair Color</label>
        <div className="flex flex-wrap gap-3">
          {hairColors.map(color => (
            <button
              key={color}
              onClick={() => updateConfig('hairColor', color)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                config.hairColor === color ? 'border-brand-pink scale-110 shadow-lg' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: `#${color}` }}
              aria-label={`Hair color ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Hair Style (Top) */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Hair / Headwear</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tops.map(style => (
            <button
              key={style.id}
              onClick={() => updateConfig('top', style.id)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                config.top === style.id 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Accessories</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {accessoryOptions.map(style => (
            <button
              key={style.id}
              onClick={() => updateConfig('accessories', style.id)}
              className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                (config.accessories || 'none') === style.id 
                  ? 'border-brand-pink bg-brand-pink/5 text-brand-pink' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
}
