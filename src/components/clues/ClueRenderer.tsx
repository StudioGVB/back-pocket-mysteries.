'use client';

import React from 'react';
import { ClueFormat, inferClueFormat } from '@/utils/clue-format';
import { ChatClueView, ClueViewProps } from './ChatClueView';
import { ReceiptClueView } from './ReceiptClueView';
import { DocumentClueView } from './DocumentClueView';
import { CctvClueView } from './CctvClueView';
import { AudioClueView } from './AudioClueView';
import { PropClueView } from './PropClueView';
import { SearchLogClueView } from './SearchLogClueView';
import { SocialClueView } from './SocialClueView';
import { NoteClueView } from './NoteClueView';
import { MedicalClueView } from './MedicalClueView';
import { CallSheetClueView } from './CallSheetClueView';

export interface ClueRendererProps extends ClueViewProps {
  formatOverride?: ClueFormat | null;
}

export function ClueRenderer({
  clue,
  formatOverride,
  hydratedTitle,
  hydratedDescription,
  characters,
  compact = false,
  showImage = true,
}: ClueRendererProps) {
  const resolvedFormat: ClueFormat =
    formatOverride ||
    (clue.format as ClueFormat) ||
    inferClueFormat(clue);

  const viewProps = {
    clue,
    hydratedTitle,
    hydratedDescription,
    characters,
    compact,
    showImage,
  };

  switch (resolvedFormat) {
    case 'chat':
      return <ChatClueView {...viewProps} />;
    case 'receipt':
      return <ReceiptClueView {...viewProps} />;
    case 'document':
      return <DocumentClueView {...viewProps} />;
    case 'cctv':
      return <CctvClueView {...viewProps} />;
    case 'audio':
      return <AudioClueView {...viewProps} />;
    case 'search_log':
      return <SearchLogClueView {...viewProps} />;
    case 'social_post':
      return <SocialClueView {...viewProps} />;
    case 'handwritten_note':
      return <NoteClueView {...viewProps} />;
    case 'medical_rx':
      return <MedicalClueView {...viewProps} />;
    case 'call_sheet':
      return <CallSheetClueView {...viewProps} />;
    case 'physical_prop':
    default:
      return <PropClueView {...viewProps} />;
  }
}
