import { ClueFormat } from '@/types/database';

export type { ClueFormat };

export interface ClueFormatOption {
  value: ClueFormat;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const CLUE_FORMAT_OPTIONS: ClueFormatOption[] = [
  {
    value: 'chat',
    label: '💬 Chat / SMS',
    shortLabel: 'Chat / SMS',
    icon: '💬',
    description: 'Dark-mode iMessage / WhatsApp bubble thread',
  },
  {
    value: 'search_log',
    label: '💻 Search / System Log',
    shortLabel: 'Search / Log',
    icon: '💻',
    description: 'Dark browser search history or server audit log',
  },
  {
    value: 'social_post',
    label: '📱 Social Media / Draft',
    shortLabel: 'Social Media',
    icon: '📱',
    description: 'Instagram / TikTok profile or unposted video draft',
  },
  {
    value: 'handwritten_note',
    label: '📝 Personal Note / Diary',
    shortLabel: 'Note / Diary',
    icon: '📝',
    description: 'Journal entry, torn note, or phone notes checklist',
  },
  {
    value: 'medical_rx',
    label: '💊 Medical / Rx Label',
    shortLabel: 'Medical / Rx',
    icon: '💊',
    description: 'Pharmacy prescription label or toxicology slip',
  },
  {
    value: 'call_sheet',
    label: '📋 Clipboard / Call Sheet',
    shortLabel: 'Call Sheet',
    icon: '📋',
    description: 'Backstage clipboard memo with pinned sticky note',
  },
  {
    value: 'receipt',
    label: '🧾 Receipt',
    shortLabel: 'Receipt',
    icon: '🧾',
    description: 'Jagged thermal store or bar receipt',
  },
  {
    value: 'document',
    label: '📑 Document / Dossier',
    shortLabel: 'Document / Dossier',
    icon: '📑',
    description: 'Forensic lab report, dossier, or formal letter',
  },
  {
    value: 'cctv',
    label: '📹 CCTV Footage',
    shortLabel: 'CCTV Footage',
    icon: '📹',
    description: 'Security camera feed with REC & scanline HUD',
  },
  {
    value: 'audio',
    label: '🎙️ Voice Note',
    shortLabel: 'Voice Note',
    icon: '🎙️',
    description: 'Interactive voice memo player with transcript',
  },
  {
    value: 'physical_prop',
    label: '🔍 Physical Prop',
    shortLabel: 'Physical Prop',
    icon: '🔍',
    description: 'Crime scene physical evidence item & notes',
  },
];

const VALID_FORMATS = new Set<ClueFormat>([
  'chat',
  'receipt',
  'document',
  'cctv',
  'audio',
  'physical_prop',
  'search_log',
  'social_post',
  'handwritten_note',
  'medical_rx',
  'call_sheet',
]);

const FORMAT_TAG_REGEX =
  /\[FORMAT:(chat|receipt|document|cctv|audio|physical_prop|search_log|social_post|handwritten_note|medical_rx|call_sheet)\]\s*/i;
const AUDIO_URL_TAG_REGEX = /\[AUDIO_URL:([^\]]+)\]\s*/i;
const VOICE_REGION_TAG_REGEX = /\[VOICE_REGION:(en-US|en-GB|en-AU)\]\s*/i;

export function extractFormatTagFromNotes(notes?: string | null): ClueFormat | null {
  if (!notes) return null;
  const match = notes.match(FORMAT_TAG_REGEX);
  if (match && VALID_FORMATS.has(match[1].toLowerCase() as ClueFormat)) {
    return match[1].toLowerCase() as ClueFormat;
  }
  return null;
}

export function extractAudioUrlFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(AUDIO_URL_TAG_REGEX);
  return match?.[1]?.trim() || null;
}

export function extractVoiceRegionFromNotes(notes?: string | null): 'en-US' | 'en-GB' | 'en-AU' | null {
  if (!notes) return null;
  const match = notes.match(VOICE_REGION_TAG_REGEX);
  return (match?.[1] as 'en-US' | 'en-GB' | 'en-AU') || null;
}

const CLUE_CODE_PREFIX_REGEX = /^R\d+\s*[-•:]?\s*C\d+\s*[:\-–—]\s*/i;

export function stripCustomerFacingTitle(title?: string | null): string {
  if (!title) return '';
  return title.replace(CLUE_CODE_PREFIX_REGEX, '').trim();
}

export function stripFormatTagFromNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(FORMAT_TAG_REGEX, '')
    .replace(AUDIO_URL_TAG_REGEX, '')
    .replace(VOICE_REGION_TAG_REGEX, '')
    .trim();
}

export function embedFormatTagInNotes(
  notes: string | null | undefined,
  format: ClueFormat | null | undefined,
  options?: {
    audioUrl?: string | null;
    voiceRegion?: string | null;
  }
): string {
  const existingAudioUrl =
    options?.audioUrl !== undefined ? options.audioUrl : extractAudioUrlFromNotes(notes);
  const existingVoiceRegion =
    options?.voiceRegion !== undefined ? options.voiceRegion : extractVoiceRegionFromNotes(notes);
  const existingFormat =
    format !== undefined ? format : extractFormatTagFromNotes(notes);

  const cleanNotes = stripFormatTagFromNotes(notes);
  const tags: string[] = [];

  if (existingFormat && VALID_FORMATS.has(existingFormat)) {
    tags.push(`[FORMAT:${existingFormat}]`);
  }
  if (existingVoiceRegion && ['en-US', 'en-GB', 'en-AU'].includes(existingVoiceRegion)) {
    tags.push(`[VOICE_REGION:${existingVoiceRegion}]`);
  }
  if (existingAudioUrl) {
    tags.push(`[AUDIO_URL:${existingAudioUrl}]`);
  }

  const prefix = tags.join(' ');
  if (!prefix) return cleanNotes;
  return cleanNotes ? `${prefix} ${cleanNotes}` : prefix;
}

/**
 * Infers the ClueFormat when clue.format is unset or null so existing clues don't break.
 */
export function inferClueFormat(clue: {
  format?: ClueFormat | string | null;
  title?: string | null;
  description?: string | null;
  template_text?: string | null;
  generation_prompt?: string | null;
  clue_type?: string | null;
  internal_notes?: string | null;
}): ClueFormat {
  if (clue?.format && VALID_FORMATS.has(clue.format as ClueFormat)) {
    return clue.format as ClueFormat;
  }

  const taggedFormat = extractFormatTagFromNotes(clue?.internal_notes);
  if (taggedFormat) {
    return taggedFormat;
  }

  const rawDesc = (clue?.description || '').trim();
  const title = (clue?.title || '').toLowerCase();
  const desc = rawDesc.toLowerCase();
  const template = (clue?.template_text || '').toLowerCase();
  const prompt = (clue?.generation_prompt || '').toLowerCase();
  const combined = `${title} ${desc} ${template}`;

  // 0. Check explicit emoji headers used in seeded mysteries first
  if (rawDesc.startsWith('💬')) return 'chat';
  if (rawDesc.startsWith('🎙️')) return 'audio';
  if (rawDesc.startsWith('🧾')) return 'receipt';
  if (rawDesc.startsWith('📹')) return 'cctv';
  if (rawDesc.startsWith('💻') || rawDesc.startsWith('🔍')) return 'search_log';
  if (rawDesc.startsWith('📱')) return 'social_post';
  if (rawDesc.startsWith('💊')) return 'medical_rx';
  if (rawDesc.startsWith('📋')) return 'call_sheet';
  if (rawDesc.startsWith('📓') || rawDesc.startsWith('📌') || rawDesc.startsWith('📝')) return 'handwritten_note';
  if (rawDesc.startsWith('📑')) return 'document';
  if (rawDesc.startsWith('📸')) return 'physical_prop';

  // 1. Audio / Voice Note
  if (
    title.includes('audio') ||
    title.includes('recording') ||
    title.includes('voice') ||
    title.includes('voicemail') ||
    title.includes('wiretap') ||
    title.includes('overheard') ||
    desc.includes('audio recording') ||
    desc.includes('voice note') ||
    desc.includes('voicemail') ||
    desc.includes('recording transcript') ||
    desc.includes('caught on tape') ||
    prompt.includes('voice recorder') ||
    prompt.includes('microphone')
  ) {
    return 'audio';
  }

  // 2. Search History / Spyware / Server Audit Log
  if (
    title.includes('eye spy') ||
    title.includes('search history') ||
    title.includes('server audit') ||
    title.includes('server log') ||
    desc.includes('eye spy software') ||
    desc.includes('search history:') ||
    desc.includes('recent tabs') ||
    desc.includes('error: file unfound') ||
    desc.includes('actioned by:')
  ) {
    return 'search_log';
  }

  // 3. Social Media / Fanpage / Post Draft
  if (
    title.includes('instagram') ||
    title.includes('tiktok') ||
    title.includes('social post') ||
    title.includes('fanpage') ||
    desc.includes('post draft') ||
    desc.includes('followers') ||
    desc.includes('post grid captions') ||
    desc.includes('audio selected:')
  ) {
    return 'social_post';
  }

  // 4. Medical / Prescription / Toxicology Rx
  if (
    title.includes('prescription') ||
    title.includes('temazepam') ||
    title.includes('medication') ||
    desc.includes('medication:') ||
    desc.includes('prescribed to:') ||
    prompt.includes('blister')
  ) {
    return 'medical_rx';
  }

  // 5. Backstage Call Sheet / Production Clipboard with Sticky Note
  if (
    title.includes('clipboard') ||
    title.includes('call sheet') ||
    desc.includes('handwritten note at bottom') ||
    prompt.includes('clipboard')
  ) {
    return 'call_sheet';
  }

  // 6. Personal Note / Diary / Checklist
  if (
    title.includes('personal note') ||
    title.includes('unsent note') ||
    title.includes('torn') ||
    title.includes('crumpled') ||
    title.includes('journal') ||
    title.includes('diary') ||
    title.includes('checklist') ||
    title.includes('notes app') ||
    desc.includes('to do:') ||
    desc.includes('[strikethrough]')
  ) {
    return 'handwritten_note';
  }

  // 7. CCTV / Security Camera
  if (
    title.includes('cctv') ||
    title.includes('surveillance') ||
    title.includes('security cam') ||
    title.includes('camera') ||
    title.includes('footage') ||
    title.includes('.mov') ||
    desc.includes('cctv') ||
    desc.includes('security cam') ||
    desc.includes('camera footage') ||
    desc.includes('video footage') ||
    desc.includes('surveillance') ||
    prompt.includes('cctv') ||
    prompt.includes('security camera') ||
    prompt.includes('surveillance')
  ) {
    return 'cctv';
  }

  // 8. Chat / SMS / DM
  if (
    title.includes('text') ||
    title.includes('sms') ||
    title.includes('chat') ||
    title.includes('message') ||
    title.includes('dm') ||
    title.includes('whatsapp') ||
    title.includes('imessage') ||
    title.includes('screengrab') ||
    title.includes('screenshot') ||
    desc.includes('dm thread') ||
    desc.includes('group chat') ||
    desc.includes('text message') ||
    desc.includes('chat log') ||
    desc.includes('messages between') ||
    desc.includes('dm from') ||
    desc.includes('sent a text') ||
    desc.includes('screengrab')
  ) {
    return 'chat';
  }

  // 9. Receipt / Bar Tab / Invoice
  if (
    title.includes('receipt') ||
    title.includes('bar tab') ||
    title.includes('tab') ||
    title.includes('bill') ||
    title.includes('invoice') ||
    title.includes('transaction') ||
    title.includes('purchase') ||
    title.includes('ticket') ||
    desc.includes('receipt') ||
    desc.includes('bar tab') ||
    desc.includes('itemized') ||
    desc.includes('subtotal') ||
    desc.includes('paid in cash') ||
    desc.includes('credit card slip')
  ) {
    return 'receipt';
  }

  // 10. Document / Dossier / Lab Report / Letter
  if (
    title.includes('report') ||
    title.includes('dossier') ||
    title.includes('document') ||
    title.includes('letter') ||
    title.includes('ledger') ||
    title.includes('contract') ||
    title.includes('will') ||
    title.includes('toxicology') ||
    title.includes('autopsy') ||
    title.includes('forensic') ||
    title.includes('file') ||
    title.includes('email') ||
    title.includes('manifest') ||
    title.includes('certificate') ||
    title.includes('record') ||
    combined.includes('toxicology') ||
    combined.includes('lab report') ||
    combined.includes('police report') ||
    combined.includes('confidential') ||
    clue?.clue_type === 'document'
  ) {
    return 'document';
  }

  // 11. Default to Physical Prop
  return 'physical_prop';
}

// ============================================================================
// FORMAT PARSERS FOR DEDICATED CLUE RENDERERS
// ============================================================================

export interface ChatBubble {
  id: string;
  sender: string;
  initials: string;
  message: string;
  timestamp: string;
  isPrimary: boolean;
  status: string;
  isRedacted?: boolean;
}

export interface ParsedChatClue {
  headerTitle: string;
  threadTitle: string;
  participants: string[];
  contextNote?: string;
  bubbles: ChatBubble[];
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (/^(sender|unknown|anonymous)$/i.test(trimmed)) return '?';
  const senderNumMatch = trimmed.match(/^sender\s*(\d+)$/i);
  if (senderNumMatch) return `S${senderNumMatch[1]}`;
  const cleaned = trimmed.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!cleaned) {
    const emojiMatch = trimmed.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u);
    return emojiMatch ? emojiMatch[0] : '?';
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function normalizeChatHeaderTitle(
  rawTitle: string,
  namedParticipants: string[],
  explicitContactHeader?: string
): string {
  const base = stripCustomerFacingTitle(rawTitle || '')
    .replace(/\s*\(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?\)\s*$/i, '')
    .trim();

  if (explicitContactHeader && explicitContactHeader.trim()) {
    const cleanContact = explicitContactHeader.trim();
    if (!/^(unknown|sender|anonymous)$/i.test(cleanContact)) {
      return cleanContact;
    }
  }

  // Detect unrealistic meta-descriptions in chat titles (e.g., "Intercepted Lock-Screen Texts...", "Pantry Texts: ...", "Anonymous Text Thread", "Direct Messages")
  const isMetaChatTitle =
    /^(?:intercepted|leaked|recovered|deleted|anonymous|private|secret|burner|lock-screen|pantry|kitchen|hallway|backstage|overheard|screenshot|screengrab|text|texts|sms|dm|dms|direct\s+messages?|chat|thread|messages?|chain)\b/i.test(
      base
    ) ||
    /\b(?:text\s*chain|text\s*thread|lock-screen\s*texts?|burner\s*thread|pantry\s*texts?|text\s*messages?|sms\s*log|chat\s*log|direct\s*messages?|anonymous\s*text)\b/i.test(
      base
    );

  if (!isMetaChatTitle && base) {
    return base;
  }

  // If the meta title had a parenthetical codename like ("Wifey 🎄❤️"), extract it
  const parenQuotedMatch = base.match(/\(\s*["“']([^"”']+)["”']\s*\)/);
  if (parenQuotedMatch && parenQuotedMatch[1].trim()) {
    return parenQuotedMatch[1].trim();
  }

  // Otherwise derive a realistic contact name, emoji/codename, or group chat name from the participants
  if (namedParticipants.length === 1) {
    return namedParticipants[0];
  }
  if (namedParticipants.length === 2) {
    const codenameParticipant = namedParticipants.find(p =>
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(p)
    );
    if (codenameParticipant) return codenameParticipant;
    return `${namedParticipants[0]} & ${namedParticipants[1]}`;
  }
  if (namedParticipants.length > 2) {
    return `${namedParticipants[0]}, ${namedParticipants[1]} +${namedParticipants.length - 2}`;
  }

  return '🔒 Unknown Number';
}

export function parseChatClue(title: string, rawText: string): ParsedChatClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const cleanText = (rawText || '').trim();
  const lines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const bubbles: ChatBubble[] = [];
  const contextLines: string[] = [];
  const senderOrder: string[] = [];
  let explicitStatusFooter = '';
  let explicitContactHeader = '';

  const registerSender = (sender: string) => {
    const norm = sender.trim();
    if (!senderOrder.includes(norm)) {
      senderOrder.push(norm);
    }
    if (/^(me|you|self|outgoing)$/i.test(norm)) return true;
    const hasExplicitSelf = senderOrder.some(s => /^(me|you|self|outgoing)$/i.test(s));
    if (hasExplicitSelf) return false;
    return senderOrder.indexOf(norm) === 1;
  };

  const defaultTimes = ['10:41 PM', '10:42 PM', '10:44 PM', '10:45 PM', '10:47 PM', '10:49 PM'];

  // Pattern 1: [timestamp] Sender: Message  OR  (timestamp) Sender: Message
  const bracketTimeSenderRegex = /^[\[\(]([^\]\)]+)[\]\)]\s*([^:]{1,35}):\s*(.+)$/;
  // Pattern 2: Sender [timestamp]: Message  OR  Sender (timestamp): Message
  const senderBracketTimeRegex = /^([^:\[\(]{1,35})\s*[\[\(]([^\]\)]+)[\]\)]\s*:\s*(.+)$/;
  // Pattern 3: Sender: Message (supports emojis, curly braces, and symbols in contact names, while excluding metadata headers)
  const simpleSenderRegex = /^([^:\r\n]{1,35}):\s*(.+)$/;
  const hasRecipientHeader = lines.some(l => /^(Recipient|To)\s*:/i.test(l));
  const reservedHeaders = new Set([
    ...(hasRecipientHeader ? ['sender'] : []),
    'contact',
    'chat',
    'thread',
    'group',
    'group chat',
    'channel',
    'conversation',
    'recipient',
    'from',
    'to',
    'participants',
    'speakers',
    'status',
    'metadata',
    'context',
    'note',
    'location',
    'timestamp',
    'time',
    'date',
    'subject',
    'evidence',
    'summary',
    'device',
    'phone',
    'source',
    'recovered',
  ]);

  lines.forEach((line, idx) => {
    // Strip top emoji header lines like "💬 PRIVATE DM THREAD" or "💬 CAST GROUP CHAT (From X's phone)"
    if (line.startsWith('💬')) {
      return;
    }

    // Ignore standalone section header lines ending with a colon and no message (e.g. "Private Work Chat (7:35 PM):")
    if (/^[^:]{1,50}:\s*$/.test(line)) {
      return;
    }

    // Ignore backend Context: or Context / Participants: lines so they never appear on customer-facing clues
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) {
      return;
    }

    // Handle Contact: / Group Chat: / Thread: metadata lines so they set the header instead of becoming a fake bubble
    const contactHeaderMatch = line.match(/^(?:Contact|Group\s*Chat|Thread|Chat)\s*:\s*(.+)$/i);
    if (contactHeaderMatch) {
      explicitContactHeader = contactHeaderMatch[1].trim();
      return;
    }

    // Skip irrelevant [Earlier incoming messages: ...] placeholder lines
    if (/^\[?Earlier (?:incoming )?messages/i.test(line)) {
      return;
    }

    // Handle [Sent 12:14PM], [Status: SEEN], [Sent 5:20PM • Status: SEEN] metadata for the preceding bubble
    const sentStatusMatch = line.match(/^\[(?:Sent\s+([^•\]]+))?(?:\s*•\s*)?(?:Status:\s*([^\]]+))?\]$/i);
    if (sentStatusMatch && (sentStatusMatch[1] || sentStatusMatch[2]) && bubbles.length > 0) {
      const lastBubble = bubbles[bubbles.length - 1];
      if (sentStatusMatch[1]) lastBubble.timestamp = sentStatusMatch[1].trim();
      if (sentStatusMatch[2]) lastBubble.status = `${sentStatusMatch[2].trim()} ✓✓`;
      return;
    }

    // Handle metadata lines like "Sender: Gabby" (only when paired with a Recipient: header) or "From: Gabby"
    const metaSenderMatch = line.match(/^(Sender|From)\s*:\s*(.+)$/i);
    if (metaSenderMatch && (hasRecipientHeader || /^from$/i.test(metaSenderMatch[1]))) {
      const s = metaSenderMatch[2].trim();
      if (s && !senderOrder.includes(s)) senderOrder.push(s);
      return;
    }

    const metaRecipientMatch = line.match(/^(Recipient|To)\s*:\s*(.+)$/i);
    if (metaRecipientMatch) {
      const r = metaRecipientMatch[2].trim();
      if (r && !senderOrder.includes(r)) senderOrder.push(r);
      return;
    }

    // Handle status lines like "(Status: SEEN 5:21 PM - No Reply)"
    const statusLineMatch = line.match(/^[\(\[]?Status\s*:\s*([^\)\]]+)[\)\]]?$/i);
    if (statusLineMatch) {
      explicitStatusFooter = statusLineMatch[1].trim();
      return;
    }

    let match = line.match(bracketTimeSenderRegex);
    if (match) {
      const timestamp = match[1].trim();
      const sender = match[2].trim();
      const message = match[3].trim().replace(/^["“]|["”]$/g, '');
      const isPrimary = registerSender(sender);
      bubbles.push({
        id: `msg-${idx}`,
        sender,
        initials: getInitials(sender),
        message,
        timestamp,
        isPrimary,
        status: isPrimary ? 'Read ✓✓' : 'Delivered ✓✓',
      });
      return;
    }

    match = line.match(senderBracketTimeRegex);
    if (match) {
      const sender = match[1].trim();
      const timestamp = match[2].trim();
      const message = match[3].trim().replace(/^["“]|["”]$/g, '');
      const isPrimary = registerSender(sender);
      bubbles.push({
        id: `msg-${idx}`,
        sender,
        initials: getInitials(sender),
        message,
        timestamp,
        isPrimary,
        status: isPrimary ? 'Read ✓✓' : 'Delivered ✓✓',
      });
      return;
    }

    match = line.match(simpleSenderRegex);
    if (
      match &&
      !reservedHeaders.has(match[1].trim().toLowerCase()) &&
      !/^https?$/i.test(match[1].trim()) &&
      !/^\d{1,2}$/.test(match[1].trim())
    ) {
      const sender = match[1].trim();
      const message = match[2].trim().replace(/^["“]|["”]$/g, '');
      const isPrimary = registerSender(sender);
      bubbles.push({
        id: `msg-${idx}`,
        sender,
        initials: getInitials(sender),
        message,
        timestamp: defaultTimes[bubbles.length % defaultTimes.length],
        isPrimary,
        status: isPrimary ? 'Read ✓✓' : 'Delivered ✓✓',
      });
      return;
    }

    contextLines.push(line);
  });

  // Apply explicit status footer (e.g. "SEEN 5:21 PM - No Reply") to the last bubble if present
  if (explicitStatusFooter && bubbles.length > 0) {
    bubbles[bubbles.length - 1].status = `${explicitStatusFooter} ✓✓`;
  }

  // Fallback if the clue text was written as narrative prose with quoted messages
  if (bubbles.length === 0 && cleanText) {
    const quoteRegex = /["“]([^"”]{4,})["”]/g;
    const quotes: string[] = [];
    let qMatch;
    while ((qMatch = quoteRegex.exec(cleanText)) !== null) {
      quotes.push(qMatch[1].trim());
    }

    const fromToMatch = cleanText.match(/from\s+([A-Z][a-zA-Z\s]{1,20}?)\s+to\s+([A-Z][a-zA-Z\s]{1,20}?)(?:[\s,.:;]|$)/);
    const senderA = senderOrder[0] || (fromToMatch ? fromToMatch[1].trim() : 'Unknown');
    const senderB = senderOrder[1] || (fromToMatch ? fromToMatch[2].trim() : 'Recipient');

    if (quotes.length > 0) {
      quotes.forEach((q, idx) => {
        const sender = idx % 2 === 0 ? senderA : senderB;
        const isPrimary = idx % 2 === 1;
        if (!senderOrder.includes(sender)) senderOrder.push(sender);
        bubbles.push({
          id: `quote-${idx}`,
          sender,
          initials: getInitials(sender),
          message: q,
          timestamp: defaultTimes[idx % defaultTimes.length],
          isPrimary,
          status: explicitStatusFooter || (isPrimary ? 'Read ✓✓' : 'Delivered ✓✓'),
        });
      });
    } else {
      contextLines.length = 0;
      if (!senderOrder.includes(senderA)) senderOrder.push(senderA);
      bubbles.push({
        id: 'fallback-single',
        sender: senderA,
        initials: getInitials(senderA),
        message: cleanText,
        timestamp: '11:14 PM',
        isPrimary: false,
        status: explicitStatusFooter || 'Delivered ✓✓',
      });
    }
  }

  // Filter out generic "Sender" or "Me" labels from top bar participants
  const namedParticipants = senderOrder.filter(
    s => !/^(sender|sender\s*\d+|cast member|unknown|redacted|contact|me|you|self|outgoing)$/i.test(s.trim())
  );

  const headerTitle = normalizeChatHeaderTitle(cleanTitle, namedParticipants, explicitContactHeader);

  const distinctParticipants = namedParticipants.filter(
    p => p.trim().toLowerCase() !== headerTitle.trim().toLowerCase()
  );

  const threadSubtitle =
    distinctParticipants.length > 0
      ? distinctParticipants.join(' • ')
      : namedParticipants.length > 1
      ? namedParticipants.join(' • ')
      : senderOrder.length > 2
      ? `${senderOrder.length} Participants`
      : 'Private Message';

  return {
    headerTitle,
    threadTitle: threadSubtitle,
    participants: namedParticipants.length > 0 ? namedParticipants : ['?'],
    contextNote: contextLines.length > 0 ? contextLines.join(' ') : undefined,
    bubbles,
  };
}

export interface ReceiptLineItem {
  qty: string;
  item: string;
  price: string;
}

export interface ParsedReceiptClue {
  merchant: string;
  receiptNumber: string;
  timestamp: string;
  items: ReceiptLineItem[];
  subtotal: string;
  tax: string;
  total: string;
  notes?: string;
}

export function parseReceiptClue(title: string, rawText: string): ParsedReceiptClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const cleanText = (rawText || '').trim();
  const lines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const items: ReceiptLineItem[] = [];
  const noteLines: string[] = [];
  let merchant = (cleanTitle || 'THE VELVET LOUNGE & BAR').toUpperCase();
  let timestamp = '23:18 • TERM #04';
  let total = '';

  const itemPriceRegex = /^(?:(\d+)\s*[xX*]?\s+)?(.+?)\s+[-–.]*\s*(\$\d+(?:[.,]\d{2})?)$/;

  lines.forEach(line => {
    if (line.startsWith('🧾')) {
      const cleanedHeader = line.replace(/^🧾\s*/, '').trim();
      if (cleanedHeader) merchant = cleanedHeader.toUpperCase();
      return;
    }
    if (/^(total|amount due|balance)[\s:]/i.test(line)) {
      const pMatch = line.match(/\$\d+(?:[.,]\d{2})?/);
      if (pMatch) total = pMatch[0];
      return;
    }
    if (/^(date|time|timestamp)[\s:]/i.test(line)) {
      timestamp = line.replace(/^(date|time|timestamp)[\s:]*/i, '').trim();
      return;
    }
    if (/^(merchant|venue|store|bar)[\s:]/i.test(line)) {
      merchant = line.replace(/^(merchant|venue|store|bar)[\s:]*/i, '').trim().toUpperCase();
      return;
    }

    const match = line.match(itemPriceRegex);
    if (match) {
      items.push({
        qty: match[1] || '1',
        item: match[2].replace(/^[-•*]\s*/, '').trim(),
        price: match[3],
      });
    } else {
      noteLines.push(line);
    }
  });

  if (items.length === 0) {
    const priceMentions = cleanText.match(/\$\d+(?:[.,]\d{2})?/g);
    items.push({
      qty: '1',
      item: (cleanTitle || 'EVIDENCE TRANSACTION').toUpperCase(),
      price: priceMentions?.[0] || '$85.00',
    });
    if (priceMentions && priceMentions.length > 1) {
      items.push({
        qty: '1',
        item: 'SERVICE / SURCHARGE',
        price: priceMentions[1],
      });
    }
  }

  const numericSum = items.reduce((acc, it) => {
    const num = parseFloat(it.price.replace(/[^0-9.]/g, ''));
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  const subtotalStr = `$${numericSum.toFixed(2)}`;
  const taxNum = +(numericSum * 0.085).toFixed(2);
  const taxStr = `$${taxNum.toFixed(2)}`;
  const computedTotal = total || `$${(numericSum + taxNum).toFixed(2)}`;

  return {
    merchant,
    receiptNumber: `CHK #${Math.abs((cleanTitle || 'receipt').split('').reduce((a, c) => a + c.charCodeAt(0), 4082))}`,
    timestamp,
    items,
    subtotal: subtotalStr,
    tax: taxStr,
    total: computedTotal,
    notes: noteLines.length > 0 ? noteLines.join('\n') : undefined,
  };
}

export interface ParsedDocumentClue {
  department: string;
  caseRef: string;
  subject: string;
  date: string;
  hasExplicitDate: boolean;
  stamp: 'CONFIDENTIAL' | 'EVIDENCE';
  sections: { label: string; content: string }[];
  body: string;
}

export function parseDocumentClue(title: string, rawText: string): ParsedDocumentClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const cleanText = (rawText || '').trim();
  const lines = cleanText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let subject = cleanTitle || 'EVIDENCE EXHIBIT';
  let date = '';
  let hasExplicitDate = false;
  let department = 'EVIDENCE EXHIBIT';
  const sections: { label: string; content: string }[] = [];
  const bodyLines: string[] = [];

  const keyValRegex = /^(SUBJECT|DATE|TIME|TIME RANGE|FROM|TO|FINDINGS|ANALYSIS|SUMMARY|LOCATION|HANDWRITING|DEVICE|ACCESSING DEVICE|SOFTWARE|SOURCE|LAB|OFFICER|STATUS|ACTIONED BY|REASON|METADATA|RESTORED METADATA|FILE|MEDICATION|PRESCRIBED TO|ISSUE DATE|REF|ACCOUNT|STATS|BIO|TAGS|AUDIO SELECTED)\s*:\s*(.+)$/i;

  lines.forEach((line, idx) => {
    // Strip backend Context: lines
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) {
      return;
    }

    // Skip long ASCII horizontal lines so they don't overflow cards
    if (/^-{5,}$/.test(line)) {
      return;
    }

    // Handle leading emoji header line e.g. "📌 STICKY NOTE" or "💻 DIGITAL FORENSICS INTERCEPT"
    if (idx === 0 && /^[📌📋📑🔍📓💻📸📱]\s*/.test(line)) {
      const headerText = line.replace(/^[📌📋📑🔍📓💻📸📱]\s*/, '').trim();
      if (headerText) {
        department = headerText.toUpperCase();
      }
      return;
    }

    // Parse "EYE SPY SOFTWARE - Accessing Device: 269" into structured metadata
    const eyeSpyMatch = line.match(/^EYE SPY SOFTWARE\s*[—\-–]\s*Accessing Device:\s*(.+)$/i);
    if (eyeSpyMatch) {
      department = 'DIGITAL FORENSICS INTERCEPT';
      sections.push({ label: 'SOFTWARE', content: 'Eye Spy Intercept Utility' });
      sections.push({ label: 'DEVICE ID', content: `#${eyeSpyMatch[1].trim()}` });
      return;
    }

    // Strip "Post Draft (11:01):" style line if time is already captured or convert it to TIME metadata
    const postDraftMatch = line.match(/^Post Draft\s*\(([^)]+)\)\s*:?$/i);
    if (postDraftMatch) {
      if (!hasExplicitDate) {
        date = `${postDraftMatch[1].trim()} (Saved Draft)`;
        hasExplicitDate = true;
      }
      return;
    }

    // Skip body lines that duplicate the document title/subject verbatim
    if (
      cleanTitle &&
      line.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
    ) {
      return;
    }

    const match = line.match(keyValRegex);
    if (match) {
      const key = match[1].toUpperCase();
      const val = match[2].trim();
      if (key === 'SUBJECT') subject = val;
      else if (key === 'DATE' || key === 'TIME' || key === 'TIME RANGE' || key === 'ISSUE DATE') {
        date = val;
        hasExplicitDate = true;
      } else if (key === 'LAB') {
        department = val.toUpperCase();
      } else {
        sections.push({ label: key, content: val });
      }
    } else {
      bodyLines.push(line);
    }
  });

  const lowerAll = `${cleanTitle} ${cleanText}`.toLowerCase();

  // Auto-categorize department label when not explicitly provided via emoji header
  if (department === 'EVIDENCE EXHIBIT') {
    if (lowerAll.includes('search history') || lowerAll.includes('eye spy')) {
      department = 'DIGITAL FORENSICS INTERCEPT';
    } else if (lowerAll.includes('temazepam') || lowerAll.includes('prescription') || lowerAll.includes('medication:')) {
      department = 'PHARMACY PRESCRIPTION RECORD';
    } else if (lowerAll.includes('sec cam') || lowerAll.includes('file unfound') || lowerAll.includes('actioned by:')) {
      department = 'SERVER AUDIT LOG';
    } else if (lowerAll.includes('instagram') || lowerAll.includes('followers') || lowerAll.includes('post grid')) {
      department = 'SOCIAL MEDIA PROFILE CAPTURE';
    } else if (lowerAll.includes('tags:') || lowerAll.includes('audio selected:') || lowerAll.includes('social post draft')) {
      department = 'UNPOSTED SOCIAL MEDIA DRAFT';
    } else if (lowerAll.includes('to do:') || lowerAll.includes('notes app')) {
      department = 'DIGITAL NOTES APP ENTRY';
    } else if (lowerAll.includes('handwritten note at bottom') || lowerAll.includes('call sheet')) {
      department = 'PRODUCTION CREW CALL SHEET';
    } else if (lowerAll.includes('journal') || lowerAll.includes('crumpled') || lowerAll.includes('torn')) {
      department = 'RECOVERED PERSONAL NOTE';
    }
  }

  const stamp: 'CONFIDENTIAL' | 'EVIDENCE' =
    lowerAll.includes('confidential') ||
    lowerAll.includes('secret') ||
    lowerAll.includes('medical') ||
    lowerAll.includes('temazepam') ||
    lowerAll.includes('dossier')
      ? 'CONFIDENTIAL'
      : 'EVIDENCE';

  const codeNum = Math.abs((cleanTitle || 'doc').split('').reduce((a, c) => a + c.charCodeAt(0), 1049));

  return {
    department,
    caseRef: `EX-${codeNum}`,
    subject,
    date: date || 'ON FILE',
    hasExplicitDate,
    stamp,
    sections,
    body: bodyLines.join('\n') || cleanText || 'No findings recorded.',
  };
}

export interface ParsedCctvClue {
  camera: string;
  timestamp: string;
  cleanDescription: string;
}

export function parseCctvClue(
  clue: { title?: string | null; description?: string | null },
  hydratedDescription?: string
): ParsedCctvClue {
  const rawDesc = hydratedDescription ?? clue.description ?? '';
  const cleanTitle = stripCustomerFacingTitle(clue.title);
  let camera = 'CAM 03 • MAIN HALL';
  let timestamp = '2026-10-31 23:14:08 UTC';

  const headerMatch = rawDesc.match(/^Header:\s*(.+)$/im);
  const fileMatch = rawDesc.match(/^File:\s*([^\n(]+)/im);
  const secCamBracketMatch = rawDesc.match(/SEC\s*CAM[_#\-\s]*([0-9A-Za-z]+)(?:\s*\[([^\]]+)\])?/i);
  const genericCamMatch = rawDesc.match(/CAM(?:ERA)?[_#\-\s]+([0-9A-Za-z]+(?:\s*[•\-]\s*[A-Za-z0-9\s]+)?)/i);

  if (headerMatch) {
    camera = headerMatch[1].trim().toUpperCase();
  } else if (fileMatch) {
    camera = `FILE • ${fileMatch[1].trim().toUpperCase()}`;
  } else if (secCamBracketMatch) {
    const camId = secCamBracketMatch[1].trim().toUpperCase();
    const loc = secCamBracketMatch[2]?.trim().toUpperCase();
    camera = loc ? `CAM ${camId} • ${loc}` : `CAM ${camId}`;
  } else if (genericCamMatch) {
    camera = `CAM ${genericCamMatch[1].trim().toUpperCase()}`;
  } else if (cleanTitle) {
    const shortLoc = cleanTitle
      .replace(/cctv|security|camera|footage|video|frame|still|log|of|the/gi, '')
      .trim()
      .toUpperCase();
    if (shortLoc) {
      camera = `CAM 03 • ${shortLoc.slice(0, 18)}`;
    }
  }

  const timeRangeMatch = rawDesc.match(/Time\s*Range\s*:\s*([^\n]+)/i);
  const explicitTimestampMatch = rawDesc.match(/^Timestamp\s*:\s*([^\n]+)/im);
  const clockTimeMatch = rawDesc.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|UTC))\b/i);
  const clipDurationMatch = rawDesc.match(/\((\d{1,2}:\d{2})\)/);

  if (timeRangeMatch) {
    timestamp = timeRangeMatch[1].trim().toUpperCase();
  } else if (explicitTimestampMatch) {
    timestamp = explicitTimestampMatch[1].trim().toUpperCase();
  } else if (clockTimeMatch) {
    timestamp = clockTimeMatch[1].trim().toUpperCase();
  } else if (clipDurationMatch) {
    timestamp = `CLIP LENGTH • ${clipDurationMatch[1]}`;
  }

  // Strip backend Context:, Header:, Timestamp:, File:, and Visual: prefix from bottom text
  const cleanDescription = rawDesc
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      if (/^💻\s*SECURITY SYSTEM LOG/i.test(l)) return false;
      if (/^(Context|Header|Timestamp|METADATA|File)\s*:/i.test(l)) return false;
      return true;
    })
    .map(l => l.replace(/^Visual\s*:\s*/i, ''))
    .join('\n')
    .trim();

  return {
    camera,
    timestamp,
    cleanDescription: cleanDescription || rawDesc,
  };
}

// ============================================================================
// 5 NEW SPECIALIZED CLUE FORMAT PARSERS
// ============================================================================

export interface SearchQueryItem {
  text: string;
  isFlagged: boolean;
}

export interface ParsedSearchLogClue {
  mode: 'search' | 'audit';
  systemName: string;
  deviceOrUrl: string;
  errorBanner?: string;
  metaRows: { label: string; value: string }[];
  queries: SearchQueryItem[];
  note?: string;
}

export function parseSearchLogClue(title: string, rawText: string): ParsedSearchLogClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let mode: 'search' | 'audit' = /audit|sec cam|file unfound|actioned by/i.test(`${cleanTitle} ${rawText}`)
    ? 'audit'
    : 'search';
  let systemName = mode === 'audit' ? 'SECURITY SERVER AUDIT' : 'EYE SPY INTERCEPT';
  let deviceOrUrl = mode === 'audit' ? 'sys://server-log/sec-cam-4b' : 'eyespy://device-269/history';
  let errorBanner: string | undefined;
  const metaRows: { label: string; value: string }[] = [];
  const queries: SearchQueryItem[] = [];
  const noteLines: string[] = [];

  const flaggedRegex = /poison|murder|sedative|spike|sleeping pill|roofie|blood test|dangerous|fatal|kill/i;

  lines.forEach((line, idx) => {
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) return;
    if (idx === 0 && /^[💻🔍]\s*/.test(line)) {
      systemName = line.replace(/^[💻🔍]\s*/, '').trim().toUpperCase();
      return;
    }

    const eyeSpyMatch = line.match(/^EYE SPY SOFTWARE\s*[—\-–]\s*Accessing Device:\s*(.+)$/i);
    if (eyeSpyMatch) {
      systemName = 'EYE SPY SOFTWARE v4.2';
      const devId = eyeSpyMatch[1].trim();
      deviceOrUrl = `eyespy://device-${devId.toLowerCase().replace(/[^a-z0-9]/g, '')}/search-history`;
      metaRows.push({ label: 'TARGET DEVICE', value: `Device #${devId}` });
      return;
    }

    if (/^Recent Tabs\s*\/?\s*Search History:?$/i.test(line)) {
      return;
    }

    if (/^ERROR\s*:/i.test(line)) {
      errorBanner = line.replace(/^ERROR\s*:\s*/i, '').trim();
      mode = 'audit';
      return;
    }

    const kvMatch = line.match(/^(File|Time|Status|Actioned by|Reason|Device|Software|Source)\s*:\s*(.+)$/i);
    if (kvMatch) {
      const key = kvMatch[1].toUpperCase();
      const val = kvMatch[2].trim();
      if (key === 'FILE') {
        deviceOrUrl = `srv://archive/${val.toLowerCase().replace(/[^a-z0-9_.-]/g, '-')}`;
      }
      metaRows.push({ label: key, value: val });
      return;
    }

    const noteMatch = line.match(/^Note\s*:\s*(.+)$/i);
    if (noteMatch) {
      noteLines.push(noteMatch[1].trim());
      return;
    }

    if (/^[•\-*]\s+/.test(line)) {
      const q = line.replace(/^[•\-*]\s+/, '').trim();
      queries.push({
        text: q,
        isFlagged: flaggedRegex.test(q),
      });
      return;
    }

    noteLines.push(line);
  });

  return {
    mode,
    systemName: systemName || cleanTitle || 'DIGITAL LOG',
    deviceOrUrl,
    errorBanner,
    metaRows,
    queries,
    note: noteLines.length > 0 ? noteLines.join('\n') : undefined,
  };
}

export interface ParsedSocialClue {
  isDraft: boolean;
  handle: string;
  draftTime?: string;
  stats?: string[];
  bio?: string;
  location?: string;
  audioSelected?: string;
  tags: string[];
  captions: string[];
  mainCaption?: string;
}

export function parseSocialClue(title: string, rawText: string): ParsedSocialClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let isDraft = /draft/i.test(`${cleanTitle} ${rawText}`);
  let handle = '@anonymous_creator';
  const handleInTitle = cleanTitle.match(/@[A-Za-z0-9_.-]+/);
  if (handleInTitle) handle = handleInTitle[0];

  let draftTime: string | undefined;
  let stats: string[] | undefined;
  let bio: string | undefined;
  let location: string | undefined;
  let audioSelected: string | undefined;
  const tags: string[] = [];
  const captions: string[] = [];
  const bodyLines: string[] = [];

  lines.forEach((line, idx) => {
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) return;
    if (idx === 0 && /^📱\s*/.test(line)) return;

    const draftMatch = line.match(/^Post Draft\s*\(([^)]+)\)\s*:?$/i);
    if (draftMatch) {
      isDraft = true;
      draftTime = draftMatch[1].trim();
      return;
    }

    if (/^Post Grid Captions:?$/i.test(line)) return;

    const accMatch = line.match(/^Account\s*:\s*(.+)$/i);
    if (accMatch) {
      handle = accMatch[1].trim();
      isDraft = false;
      return;
    }

    const statsMatch = line.match(/^Stats\s*:\s*(.+)$/i);
    if (statsMatch) {
      stats = statsMatch[1].split(/\s*•\s*/).map(s => s.trim()).filter(Boolean);
      return;
    }

    const bioMatch = line.match(/^Bio\s*:\s*(.+)$/i);
    if (bioMatch) {
      bio = bioMatch[1].trim().replace(/^["“]|["”]$/g, '');
      return;
    }

    const locMatch = line.match(/^Location\s*:\s*(.+)$/i);
    if (locMatch) {
      location = locMatch[1].trim();
      return;
    }

    const audioMatch = line.match(/^Audio selected\s*:\s*(.+)$/i);
    if (audioMatch) {
      audioSelected = audioMatch[1].trim();
      return;
    }

    const tagsMatch = line.match(/^Tags\s*:\s*(.+)$/i);
    if (tagsMatch) {
      const found = tagsMatch[1].split(/\s+/).filter(Boolean);
      tags.push(...found);
      return;
    }

    if (/^[•\-*]\s+/.test(line)) {
      captions.push(line.replace(/^[•\-*]\s+/, '').trim());
      return;
    }

    bodyLines.push(line);
  });

  return {
    isDraft,
    handle,
    draftTime,
    stats,
    bio,
    location,
    audioSelected,
    tags,
    captions,
    mainCaption: bodyLines.length > 0 ? bodyLines.join('\n') : undefined,
  };
}

export interface NoteChecklistItem {
  text: string;
  checked: boolean;
}

export interface ParsedNoteClue {
  variant: 'checklist' | 'phone_note' | 'paper_note';
  headerTitle: string;
  date?: string;
  items: NoteChecklistItem[];
  paragraphs: string[];
  signature?: string;
}

export function parseNoteClue(title: string, rawText: string): ParsedNoteClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let date: string | undefined;
  const items: NoteChecklistItem[] = [];
  const paragraphs: string[] = [];
  let signature: string | undefined;

  lines.forEach((line, idx) => {
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) return;
    if (idx === 0 && /^[📓📌📝📱]\s*/.test(line)) return;
    if (/^To do:?$/i.test(line)) return;

    const dateMatch = line.match(/^Date\s*:\s*(.+)$/i);
    if (dateMatch) {
      date = dateMatch[1].trim();
      return;
    }

    if (/^[•\-*]\s+/.test(line)) {
      const rawItem = line.replace(/^[•\-*]\s+/, '').trim();
      const checked = /\[strikethrough\]/i.test(rawItem);
      const cleanItem = rawItem.replace(/\s*\[strikethrough\]\s*/gi, '').trim();
      items.push({ text: cleanItem, checked });
      return;
    }

    if (/^-\s*[A-Za-z]{1,12}"?$/.test(line)) {
      signature = line.replace(/"/g, '').trim();
      return;
    }

    paragraphs.push(line);
  });

  const variant: 'checklist' | 'phone_note' | 'paper_note' =
    items.length > 0
      ? 'checklist'
      : date || /notes app/i.test(cleanTitle)
      ? 'phone_note'
      : 'paper_note';

  return {
    variant,
    headerTitle: cleanTitle || 'Personal Note',
    date,
    items,
    paragraphs,
    signature,
  };
}

export interface ParsedMedicalClue {
  medication: string;
  prescribedTo: string;
  issueDate: string;
  refCode: string;
  warning: string;
  notes?: string;
}

export function parseMedicalClue(title: string, rawText: string): ParsedMedicalClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let medication = cleanTitle.replace(/^Prescription:\s*/i, '').trim() || 'TEMAZEPAM 10MG';
  let prescribedTo = 'PATIENT ON FILE';
  let issueDate = '3 Weeks Ago';
  let refCode = 'RX-10-3-204';
  let warning = 'May cause drowsiness. Fatal when mixed with alcohol.';
  const extraLines: string[] = [];

  lines.forEach((line, idx) => {
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) return;
    if (idx === 0 && /^💊\s*/.test(line)) return;

    const medMatch = line.match(/^Medication\s*:\s*(.+)$/i);
    if (medMatch) {
      medication = medMatch[1].trim();
      return;
    }

    const ptMatch = line.match(/^Prescribed to\s*:\s*(.+)$/i);
    if (ptMatch) {
      prescribedTo = ptMatch[1].trim();
      return;
    }

    const dateMatch = line.match(/^Issue date\s*:\s*(.+)$/i);
    if (dateMatch) {
      issueDate = dateMatch[1].trim();
      return;
    }

    const refMatch = line.match(/^Ref\s*:\s*(.+)$/i);
    if (refMatch) {
      refCode = refMatch[1].trim();
      return;
    }

    const warnMatch = line.match(/^WARNING\s*:\s*(.+)$/i);
    if (warnMatch) {
      warning = warnMatch[1].trim();
      return;
    }

    extraLines.push(line);
  });

  return {
    medication,
    prescribedTo,
    issueDate,
    refCode,
    warning,
    notes: extraLines.length > 0 ? extraLines.join('\n') : undefined,
  };
}

export interface ParsedCallSheetClue {
  headerTitle: string;
  directives: string[];
  footerDirective?: string;
  stickyNote?: string;
  stickyAuthor?: string;
}

export function parseCallSheetClue(title: string, rawText: string): ParsedCallSheetClue {
  const cleanTitle = stripCustomerFacingTitle(title);
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let headerTitle = cleanTitle || 'CONFIDENTIAL - PRODUCTION MEMO';
  const directives: string[] = [];
  let footerDirective: string | undefined;
  const stickyLines: string[] = [];
  let stickyAuthor: string | undefined;
  let inSticky = false;

  lines.forEach((line, idx) => {
    if (/^context(?:\s*\/\s*participants)?\s*:/i.test(line)) return;
    if (idx === 0 && /^📋\s*/.test(line)) return;
    if (/^-{5,}$/.test(line)) return;

    if (/^CONFIDENTIAL\s*[—\-–]/i.test(line)) {
      headerTitle = line;
      return;
    }

    if (/^Handwritten Note/i.test(line)) {
      inSticky = true;
      return;
    }

    if (inSticky) {
      if (/^-\s*[A-Za-z]{1,10}"?$/.test(line)) {
        stickyAuthor = line.replace(/"/g, '').trim();
      } else {
        stickyLines.push(line.replace(/^["“]|["”]$/g, ''));
      }
      return;
    }

    if (/^[•\-*]\s+/.test(line)) {
      directives.push(line.replace(/^[•\-*]\s+/, '').trim());
      return;
    }

    footerDirective = footerDirective ? `${footerDirective}\n${line}` : line;
  });

  return {
    headerTitle,
    directives,
    footerDirective,
    stickyNote: stickyLines.length > 0 ? stickyLines.join(' ') : undefined,
    stickyAuthor,
  };
}

/**
 * Extracts explicit [CODE:R1-C2] or title prefix order index for a clue if present.
 */
export function extractClueOrderCode(clue: {
  internal_notes?: string | null;
  title?: string | null;
}): number | null {
  const notes = clue?.internal_notes || '';
  const codeMatch = notes.match(/\[CODE:R\d+-C(\d+)\]/i);
  if (codeMatch) return parseInt(codeMatch[1], 10);
  const title = clue?.title || '';
  const titleMatch = title.match(/^R\d+\s*[-•:]?\s*C(\d+)\b/i);
  if (titleMatch) return parseInt(titleMatch[1], 10);
  return null;
}

/**
 * Determines whether a clue is a fake / red-herring / subplot clue.
 */
export function isClueFakeOrRedHerring(clue: {
  evidence_status?: string | null;
  implication_type?: string | null;
  linked_plot_beat_id?: string | null;
  internal_notes?: string | null;
}): boolean {
  if (clue?.evidence_status === 'fake') return true;
  if (clue?.implication_type === 'red_herring') return true;
  if (clue?.internal_notes && /\bFAKE\b|Fake Arc/i.test(clue.internal_notes)) return true;
  return false;
}

/**
 * Deterministically shuffles/interleaves real and fake clues within a single round
 * so that real storyline clues and fake/red-herring clues are never clumped into
 * contiguous blocks (e.g. all REAL first and all FAKE last).
 */
export function shuffleRoundCluesDeterministically<
  T extends {
    id?: string | null;
    title?: string | null;
    internal_notes?: string | null;
    evidence_status?: string | null;
    implication_type?: string | null;
    linked_plot_beat_id?: string | null;
  }
>(roundClues: T[], roundNumber: number, customIsFakeFn?: (clue: T) => boolean): T[] {
  if (!Array.isArray(roundClues) || roundClues.length <= 1) {
    return roundClues || [];
  }

  // First sort by explicit [CODE:R*-C*] if present, preserving relative order otherwise
  const baseSorted = [...roundClues].sort((a, b) => {
    const codeA = extractClueOrderCode(a);
    const codeB = extractClueOrderCode(b);
    if (codeA !== null && codeB !== null) return codeA - codeB;
    if (codeA !== null) return -1;
    if (codeB !== null) return 1;
    return 0;
  });

  const isFake = customIsFakeFn || ((c: T) => isClueFakeOrRedHerring(c));
  const realClues = baseSorted.filter((c) => !isFake(c));
  const fakeClues = baseSorted.filter((c) => isFake(c));

  // If the round only has one type of clue, return baseSorted
  if (realClues.length === 0 || fakeClues.length === 0) {
    return baseSorted;
  }

  // Count transitions between real and fake in baseSorted
  let transitions = 0;
  for (let i = 1; i < baseSorted.length; i++) {
    if (isFake(baseSorted[i]) !== isFake(baseSorted[i - 1])) {
      transitions++;
    }
  }

  // If already well-mixed (more than 1 transition between real and fake), keep baseSorted
  if (transitions > 1) {
    return baseSorted;
  }

  // Otherwise, real and fake clues are clumped into two contiguous blocks!
  // Interleave them deterministically with a round-dependent offset so each round has a distinct mix.
  const total = baseSorted.length;
  const minorityIsFake = fakeClues.length <= realClues.length;
  const minority = minorityIsFake ? [...fakeClues] : [...realClues];
  const majority = minorityIsFake ? [...realClues] : [...fakeClues];

  const minorityPositions = new Set<number>();
  const mCount = minority.length;

  for (let k = 0; k < mCount; k++) {
    const bucketStart = Math.floor((k * total) / mCount);
    const bucketEnd = Math.floor(((k + 1) * total) / mCount) - 1;
    const bucketSize = Math.max(1, bucketEnd - bucketStart + 1);
    // Vary slot within bucket by roundNumber so Round 1, Round 2, Round 3 don't share the same pattern
    const offset = (roundNumber + k) % bucketSize;
    let pos = Math.min(total - 1, Math.max(0, bucketStart + offset));
    while (minorityPositions.has(pos) && pos < total - 1) {
      pos++;
    }
    while (minorityPositions.has(pos) && pos > 0) {
      pos--;
    }
    minorityPositions.add(pos);
  }

  const result: T[] = [];
  let minIdx = 0;
  let majIdx = 0;
  for (let i = 0; i < total; i++) {
    if (minorityPositions.has(i) && minIdx < minority.length) {
      result.push(minority[minIdx++]);
    } else if (majIdx < majority.length) {
      result.push(majority[majIdx++]);
    } else if (minIdx < minority.length) {
      result.push(minority[minIdx++]);
    }
  }

  return result;
}

/**
 * Groups an array of clues by round_number, shuffles real and fake clues within each round,
 * and returns a flattened array ordered by round and shuffled position.
 */
export function shuffleCluesAcrossRounds<
  T extends {
    id?: string | null;
    round_number?: number | null;
    title?: string | null;
    internal_notes?: string | null;
    evidence_status?: string | null;
    implication_type?: string | null;
    linked_plot_beat_id?: string | null;
  }
>(clues: T[], customIsFakeFn?: (clue: T) => boolean): T[] {
  if (!Array.isArray(clues) || clues.length <= 1) return clues || [];
  const roundsMap = new Map<number, T[]>();
  for (const clue of clues) {
    const r = clue.round_number || 1;
    if (!roundsMap.has(r)) roundsMap.set(r, []);
    roundsMap.get(r)!.push(clue);
  }
  const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
  const flattened: T[] = [];
  for (const r of sortedRounds) {
    const roundList = roundsMap.get(r) || [];
    flattened.push(...shuffleRoundCluesDeterministically(roundList, r, customIsFakeFn));
  }
  return flattened;
}



