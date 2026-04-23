'use client';

import dynamic from 'next/dynamic';

export const RelationshipGraphDynamic = dynamic(
  () => import('./RelationshipGraph').then((mod) => ({ default: mod.RelationshipGraph })),
  { ssr: false }
);
