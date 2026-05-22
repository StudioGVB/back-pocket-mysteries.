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

export function buildAvatarUrl(config: AvatarConfig | any, name?: string): string | undefined {
  if (!config) return undefined;
  const isBald = config.top === 'none';
  const hasAccessories = config.accessories && config.accessories !== 'none';
  
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}` +
    `&eyebrows=default&eyes=default&mouth=smile&clothesColor=262e33&backgroundColor=transparent` +
    `${isBald ? '&topProbability=0' : `&top=${config.top}`}` +
    `&hairColor=${config.hairColor}&hatColor=${config.hairColor}&skinColor=${config.skinColor}` +
    `&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}&facialHairColor=${config.hairColor}` : ''}` +
    `&accessoriesProbability=${hasAccessories ? '100' : '0'}${hasAccessories ? `&accessories=${config.accessories}` : ''}`;
}
