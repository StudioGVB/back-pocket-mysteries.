import React from 'react';
import { getUserMysteries } from '@/services/mysteries';
import { MysterySelectClient } from './MysterySelectClient';

export async function MysterySelectWrapper() {
  const mysteries = await getUserMysteries();
  
  return (
    <MysterySelectClient 
      mysteries={mysteries}
    />
  );
}
