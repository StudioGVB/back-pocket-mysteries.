export const GENERAL_COLORS = [
  '#454545', '#48c3ff', '#4558ff', '#ffaded', '#2c9151', 
  '#da60ff', '#7a00ce', '#55de77', '#fefc24', '#b5ee59', 
  '#e3b6ff', '#ffc194', '#15e1aa'
];

export function getCharacterColor(
  character: { id: string; is_victim?: boolean; plot_role?: string | null },
  allCharacters?: any[]
) {
  if (character.is_victim || character.plot_role === 'victim') return '#ff00cf';
  if (character.plot_role === 'killer') return '#ff4545';
  if (character.plot_role === 'assistant') return '#ffb92c';

  if (!allCharacters || allCharacters.length === 0) {
    // Fallback: Stable pseudo-random color based on UUID
    let hash = 0;
    for (let i = 0; i < character.id.length; i++) {
      hash = character.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GENERAL_COLORS.length;
    return GENERAL_COLORS[index];
  }

  // To guarantee unique colors, filter out the special roles and sort by ID for consistency
  const innocentChars = allCharacters
    .filter(c => !c.is_victim && c.plot_role !== 'victim' && c.plot_role !== 'killer' && c.plot_role !== 'assistant')
    .sort((a, b) => a.id.localeCompare(b.id));

  const index = innocentChars.findIndex(c => c.id === character.id);
  
  if (index === -1) return GENERAL_COLORS[0]; // fallback
  
  return GENERAL_COLORS[index % GENERAL_COLORS.length];
}
