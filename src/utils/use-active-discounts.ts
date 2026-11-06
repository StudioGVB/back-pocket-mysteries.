'use client';

import { useState, useEffect } from 'react';
import { DiscountRecord } from '@/utils/discounts';

let cachedDiscounts: DiscountRecord[] | null = null;
let inflightPromise: Promise<DiscountRecord[]> | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15_000;

async function fetchActiveDiscountsOnce(): Promise<DiscountRecord[]> {
  const now = Date.now();
  if (cachedDiscounts && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedDiscounts;
  }

  if (!inflightPromise) {
    inflightPromise = fetch('/api/discounts/active', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { discounts: [] }))
      .then((data) => {
        const list = Array.isArray(data?.discounts) ? data.discounts : [];
        cachedDiscounts = list;
        lastFetchTimestamp = Date.now();
        inflightPromise = null;
        return list;
      })
      .catch(() => {
        inflightPromise = null;
        return cachedDiscounts || [];
      });
  }

  return inflightPromise;
}

export function useActiveDiscounts(): DiscountRecord[] {
  const [discounts, setDiscounts] = useState<DiscountRecord[]>(cachedDiscounts || []);

  useEffect(() => {
    let active = true;
    fetchActiveDiscountsOnce().then((list) => {
      if (active) {
        setDiscounts(list);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return discounts;
}
