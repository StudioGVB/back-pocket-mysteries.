export interface ClueVerificationStamp {
  verifiedAt: string;
  passed: boolean;
  textCheck?: {
    passed: boolean;
    namesValid: boolean;
    pronounsValid: boolean;
    plotAligned: boolean;
    healed: boolean;
    summary: string;
  };
  photoCheck?: {
    passed: boolean;
    castMatch: boolean;
    outfitMatch: boolean;
    physicalMatch: boolean;
    sceneSense: boolean;
    retriedCount: number;
    summary: string;
  };
  audioCheck?: {
    passed: boolean;
    speakerIdentityMatch: boolean;
    genderMatch: boolean;
    accentMatch: boolean;
    audioClear: boolean;
    speakersVerified: Array<{
      speaker: string;
      gender: string;
      accent: string;
      voiceName: string;
    }>;
    summary: string;
  };
}

const QA_STAMP_REGEX = /\[QA_VERIFIED:(\{[\s\S]*?\})\]/i;

export function extractClueVerificationStamp(
  internalNotes?: string | null
): ClueVerificationStamp | null {
  if (!internalNotes) return null;
  const match = internalNotes.match(QA_STAMP_REGEX);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]) as ClueVerificationStamp;
  } catch {
    return null;
  }
}

export function embedClueVerificationStamp(
  existingNotes: string | null | undefined,
  stamp: ClueVerificationStamp
): string {
  const cleanNotes = (existingNotes || '').replace(QA_STAMP_REGEX, '').trim();
  const serialized = `[QA_VERIFIED:${JSON.stringify(stamp)}]`;
  return cleanNotes ? `${cleanNotes} ${serialized}` : serialized;
}
