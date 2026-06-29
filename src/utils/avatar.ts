export type AvatarConfig = {
  seed: string;
  top: string;
  hairLength?: string;
  hairTexture?: string;
  hairColor: string;
  skinColor: string;
  facialHair?: string;
  eyeColor?: string;
  height?: string;
  accessories?: string;
  build?: string;
  distinctiveFeatures?: string[];
};

export function buildAvatarUrl(config: AvatarConfig | any, name?: string): string | undefined {
  if (!config) return undefined;
  const isBald = config.top === 'none';
  const hasGlasses = config.distinctiveFeatures?.includes('Glasses');
  
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent` +
    `${isBald ? '&topProbability=0' : `&top=${config.top}`}` +
    `&hairColor=${config.hairColor}&hatColor=${config.hairColor}&skinColor=${config.skinColor}` +
    `&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}&facialHairColor=${config.hairColor}` : ''}` +
    `&accessoriesProbability=${hasGlasses ? '100' : '0'}${hasGlasses ? `&accessories=prescription01` : ''}` +
    `${config.build ? `&build=${encodeURIComponent(config.build)}` : ''}` +
    `${config.distinctiveFeatures && config.distinctiveFeatures.length > 0 ? `&distinctiveFeatures=${encodeURIComponent(config.distinctiveFeatures.filter((f: string) => f !== 'Glasses').join(','))}` : ''}` +
    `${config.hairLength ? `&hairLength=${encodeURIComponent(config.hairLength)}` : ''}` +
    `${config.hairTexture ? `&hairTexture=${encodeURIComponent(config.hairTexture)}` : ''}`;
}
