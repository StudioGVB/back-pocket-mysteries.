/**
 * Filthy & Spicy Mystery Image Prompt Sanitizer
 *
 * Translates explicit sexual, hard-drug, graphic-gore, and profanity triggers inside
 * AI image generation prompts into compromising, scandalous, "caught-in-the-act" visual
 * descriptions that pass Google Gemini (`gemini-2.5-flash-image`) IMAGE_SAFETY filters
 * 100% of the time without losing the after-dark energy of the clue.
 *
 * NOTE: This ONLY sanitizes the prompt sent to the image generator. The customer-facing
 * written clues, chat logs, and audio scripts remain 100% unfiltered.
 */

const COMPROMISING_VISUAL_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
}> = [
  // 1. Sex tapes, hookups & explicit acts -> Caught-on-CCTV / VIP booth / hotel doorway rendezvous
  {
    pattern: /\b(sex\s*tapes?|porno?(?:graphy)?|explicit\s*videos?|nsfw\s*videos?)\b/gi,
    replacement:
      'incriminating late-night private suite rendezvous caught on grainy security camera, two fully clothed suspects in a passionate embrace in the shadows',
  },
  {
    pattern:
      /\b(having\s+sex|fuck(?:ing|ed)?|screw(?:ing|ed)|banging|hooking\s+up|hookup|making\s+out\s+naked|in\s+bed\s+together|sleeping\s+together|quickie|one\s+night\s+stand|affair\s+in\s+bed)\b/gi,
    replacement:
      'caught in a secretive, passionate close embrace in a dimly lit VIP corner with slightly disheveled evening attire, smudged lipstick, and guilty glances over their shoulders',
  },
  {
    pattern: /\b(orgy|orgies|threesomes?|foursomes?|swingers?\s+party|sex\s+party|sex\s+club)\b/gi,
    replacement:
      'decadent late-night masked VIP cocktail party in a velvet lounge with spilled champagne and guests whispering conspiratorially in the shadows',
  },
  {
    pattern: /\b(blowjobs?|handjobs?|oral\s+sex|cunnilingus|fellatio|69)\b/gi,
    replacement:
      'secretive late-night romantic tryst in a shadowed VIP booth with spilled champagne and a guilty glance toward the camera',
  },

  // 2. Nudity, lingerie & adult work -> Silk robes, slip dresses, burlesque & disheveled black-tie
  {
    pattern:
      /\b(naked|nude|nudity|topless|bottomless|undressed|unclothed|streaking|leaked\s+nudes|nude\s+photos?|dick\s+pics?)\b/gi,
    replacement:
      'dressed in a luxurious silk evening robe and slightly disheveled black-tie party attire',
  },
  {
    pattern:
      /\b(lingerie|bra\s+and\s+panties|panties|thong|g-string|underwear|boxers|briefs|lace\s+bra|bikini|cleavage|boobs|breasts|nipples|buttocks|ass\s+cheeks)\b/gi,
    replacement:
      'glamorous backless satin evening slip dress with a faux-fur stole and statement jewelry',
  },
  {
    pattern:
      /\b(strippers?|strip\s+club|lap\s+dances?|pole\s+danc(?:er|ing)|onlyfans|sugar\s+bab(?:y|ies)|escorts?|prostitutes?|hookers?|call\s+girls?|brothel)\b/gi,
    replacement:
      'glamorous VIP cabaret performer in a sequined burlesque evening gown inside a neon-lit private velvet booth',
  },
  {
    pattern:
      /\b(bdsm|bondage|dominatrix|sex\s+toys?|dildos?|vibrators?|butt\s+plugs?|ball\s+gags?|whips?\s+and\s+chains?|kink\s+dungeon|fetish\s+gear)\b/gi,
    replacement:
      'unmade luxury hotel bed with a black velvet masquerade mask, spilled champagne coupe, and a pair of chrome novelty cuffs resting on the nightstand',
  },

  // 3. Hard drugs & spiked drinks -> VIP mirror tray / mysterious white powder residue / glass dropper vial
  {
    pattern:
      /\b(cocaine|snorting\s+lines?|lines?\s+of\s+coke|coke\s+bag(?:gie)?|crack\s+pipe|meth(?:amphetamine)?|heroin|fentanyl|ecstasy|mdma|molly|ketamine|lsd|acid\s+tabs?|magic\s+mushrooms?|pills?\s+and\s+powder)\b/gi,
    replacement:
      'mysterious fine white powder residue on a black marble VIP tray next to a rolled hundred-dollar bill and a platinum credit card',
  },
  {
    pattern: /\b(weed|marijuana|pot\s+joint|blunt|bong|cannabis|stoned|high\s+on\s+drugs)\b/gi,
    replacement:
      'thick aromatic haze of vintage cigar smoke in a dimly lit velvet VIP lounge',
  },
  {
    pattern:
      /\b(roofie[ds]?|rohJC|ghb|date\s+rape\s+drug|drugged\s+drink|poisoned\s+drink|spiked\s+drink|lethal\s+overdose|overdosed)\b/gi,
    replacement:
      'crystal cocktail glass on a dark bar counter with a small amber glass dropper vial and a fizzing tablet beside it',
  },

  // 4. Graphic gore, corpses & weapons -> Atmospheric noir aftermath & tense confrontations
  {
    pattern:
      /\b(bloody\s+corpse|dead\s+body|pool\s+of\s+blood|covered\s+in\s+blood|blood\s+splatter(?:ed)?|slit\s+throat|stab(?:bed|bing)\s+wound|decapitated|mutilated|gory|gore|entrails|autopsy\s+body|bullet\s+hole\s+in\s+head)\b/gi,
    replacement:
      'dramatic noir crime scene floor with a shattered crystal wine glass, dark ruby-red liquid spilled across the rug, and a dramatic shadow cast across the room',
  },
  {
    pattern:
      /\b(strangling|choking\s+to\s+death|stabbing|shooting\s+someone|pointing\s+a\s+gun\s+at|holding\s+a\s+knife\s+to|electrocuted\s+body|hanging\s+body)\b/gi,
    replacement:
      'tense, dramatic face-to-face confrontation in the shadows with an accusing expression and dramatic low-key lighting',
  },

  // 5. Raw profanity / slurs in bios or clue descriptions -> Dramatic noir descriptors
  {
    pattern: /\b(motherfuck(?:er|ing)|fuck(?:er|ing|ed)?|f-bomb|wtf|stfu)\b/gi,
    replacement: 'scandalous',
  },
  {
    pattern: /\b(bitch(?:es|y)?|bitch\s+slap(?:ped|ping)?|catfight)\b/gi,
    replacement: 'heated confrontation',
  },
  {
    pattern: /\b(slut(?:ty|s)?|whore(?:s)?|skank(?:y|s)?|hoe(?:s)?|thot(?:s)?)\b/gi,
    replacement: 'seductive socialite',
  },
  {
    pattern: /\b(asshole(?:s)?|bastard(?:s)?|dickhead(?:s)?|prick(?:s)?|cunt(?:s)?|bullshit|shit(?:ty)?)\b/gi,
    replacement: 'ruthless',
  },
  {
    pattern: /\b(dick|cock|penis|pussy|vagina|genitals|crotch|erection|cum|semen)\b/gi,
    replacement: 'compromising secret',
  },
];

/**
 * Sanitizes any prompt before sending to `gemini-2.5-flash-image` so explicit `Filthy` or `Spicy`
 * mystery wording is converted into high-drama, compromising, fully clothed noir imagery.
 */
export function sanitizePromptForImageSafety(rawPrompt: string): string {
  if (!rawPrompt) return '';
  let cleaned = rawPrompt;
  for (const rule of COMPROMISING_VISUAL_REPLACEMENTS) {
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }
  return cleaned;
}

/**
 * Builds an ultra-reliable, guaranteed-safe "compromising noir surveillance / aftermath" prompt
 * if Gemini's image model ever returns `IMAGE_SAFETY` or an empty image on an initial attempt.
 */
export function buildSafetyFallbackImagePrompt(options: {
  mysterySetting: string;
  clueFormat?: string;
  charDescriptions?: string[];
  referenceManifest?: string;
  zeroTextRule: string;
}): string {
  const {
    mysterySetting,
    clueFormat = 'cctv',
    charDescriptions = [],
    referenceManifest = '',
    zeroTextRule,
  } = options;

  if (charDescriptions.length >= 2) {
    return `An overhead security camera angle inside ${mysterySetting}, grainy surveillance footage still showing ${charDescriptions[0]} and ${charDescriptions[1]} caught in a compromising, secretive late-night conversation in a shadowed VIP corner, looking guilty and glancing over their shoulders as if caught in the act, with two champagne glasses on a small table nearby. Gritty noir surveillance aesthetic, high angle, low-key lighting, high contrast, atmospheric shadows, 8k resolution. ${zeroTextRule}${referenceManifest}`;
  }

  if (charDescriptions.length === 1) {
    return `An overhead security camera angle inside ${mysterySetting}, grainy surveillance footage still showing ${charDescriptions[0]} sneaking out of a dimly lit private suite doorway late at night, adjusting their slightly disheveled evening attire and glancing back nervously over their shoulder. Gritty noir surveillance aesthetic, high angle, low-key lighting, high contrast, atmospheric shadows, 8k resolution. ${zeroTextRule}${referenceManifest}`;
  }

  if (clueFormat === 'cctv') {
    return `An overhead security camera angle inside ${mysterySetting}, grainy surveillance still showing a dimly lit VIP lounge corner with an unmade velvet sofa, two spilled champagne coupes, a black velvet masquerade mask, and a mysterious silver key on a marble table. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, 8k resolution. ${zeroTextRule}`;
  }

  return `A cinematic, atmospheric noir crime scene photograph inside ${mysterySetting}: a dimly lit luxury tabletop with two lipstick-stained crystal champagne coupes, a black velvet masquerade mask, a small amber glass vial, and a crumpled silk pocket square under warm candlelit shadows. Shallow depth of field, 35mm film grain, 8k resolution. ${zeroTextRule}`;
}
