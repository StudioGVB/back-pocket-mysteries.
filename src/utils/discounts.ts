export type DiscountType = 'percentage' | 'fixed';

export type DiscountUsageLimitType = 'unlimited' | 'one_per_customer' | 'max_uses';

export type DiscountAppliesTo = 'all' | 'packages' | 'mysteries' | 'custom';

export type DiscountComputedStatus = 'active' | 'scheduled' | 'expired' | 'paused';

export interface DiscountRecord {
  id: string;
  name: string;
  code: string | null;
  auto_apply: boolean;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: DiscountAppliesTo;
  target_packages: string[];
  target_mysteries: string[];
  starts_at: string;
  ends_at: string | null;
  usage_limit: DiscountUsageLimitType;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageOption {
  id: string;
  name: string;
  subtitle: string;
  basePriceUsd: string;
}

export const PACKAGE_TIER_OPTIONS: PackageOption[] = [
  {
    id: 'basic',
    name: 'Basic Package',
    subtitle: '4–6 Players • Any Complexity & Spice Level',
    basePriceUsd: '$19',
  },
  {
    id: 'premium',
    name: 'Premium Package',
    subtitle: '4–10 Players • Any Complexity & Spice Level',
    basePriceUsd: '$25',
  },
  {
    id: 'grand',
    name: 'Grand Package',
    subtitle: '4–16 Players • Any Complexity & Spice Level',
    basePriceUsd: '$33',
  },
  {
    id: 'subscribe',
    name: 'Unlimited Monthly Plan',
    subtitle: 'Unlimited mysteries/mo (4–16 players) + 1 Free Monthly Gift Pass',
    basePriceUsd: '$39/mo',
  },
];

export interface MysteryPackageOption {
  id: string;
  slug: string;
  title: string;
  theme: string;
  complexity: 'easy' | 'medium' | 'hard';
}

export const CORE_MYSTERY_PACKAGES: MysteryPackageOption[] = [
  {
    id: 'love-on-the-rocks',
    slug: 'love-on-the-rocks',
    title: 'Love On The Rocks',
    theme: 'Reality TV Reunion',
    complexity: 'medium',
  },
  {
    id: 'the-inheritance',
    slug: 'the-inheritance',
    title: 'The Inheritance',
    theme: '1920s Manor Mystery',
    complexity: 'easy',
  },
  {
    id: 'the-gala-heist',
    slug: 'the-gala-heist',
    title: 'The Gala Heist',
    theme: 'High-Society Black Tie',
    complexity: 'hard',
  },
  {
    id: 'dead-space',
    slug: 'dead-space',
    title: 'Dead Space',
    theme: 'Sci-Fi Orbital Station',
    complexity: 'hard',
  },
  {
    id: 'speakeasy-scandal',
    slug: 'speakeasy-scandal',
    title: 'Speakeasy Scandal',
    theme: 'Prohibition Jazz Club',
    complexity: 'medium',
  },
  {
    id: 'off-the-grid',
    slug: 'off-the-grid',
    title: 'Off The Grid',
    theme: 'Wellness Retreat Gone Wrong',
    complexity: 'medium',
  },
];

export function slugifyMysteryTitle(title: string | null | undefined): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Computes whether a discount is currently Active, Scheduled (future start), Expired (past end or max uses reached), or Paused.
 */
export function getDiscountComputedStatus(
  discount: DiscountRecord,
  referenceDate: Date = new Date()
): DiscountComputedStatus {
  if (!discount.is_active) {
    return 'paused';
  }

  if (
    discount.usage_limit === 'max_uses' &&
    typeof discount.max_uses === 'number' &&
    discount.max_uses > 0 &&
    discount.times_used >= discount.max_uses
  ) {
    return 'expired';
  }

  if (discount.starts_at) {
    const start = new Date(discount.starts_at);
    if (!isNaN(start.getTime()) && start.getTime() > referenceDate.getTime()) {
      return 'scheduled';
    }
  }

  if (discount.ends_at) {
    const end = new Date(discount.ends_at);
    if (!isNaN(end.getTime()) && end.getTime() < referenceDate.getTime()) {
      return 'expired';
    }
  }

  return 'active';
}

/**
 * Checks whether a discount applies to the given package tier and/or specific murder mystery.
 */
export function doesDiscountApplyToTarget(
  discount: DiscountRecord,
  options: {
    tier?: string | null;
    mysteryId?: string | null;
    mysterySlug?: string | null;
    mysteryTitle?: string | null;
  }
): boolean {
  if (discount.applies_to === 'all') {
    return true;
  }

  const targetPackages = discount.target_packages || [];
  const targetMysteries = (discount.target_mysteries || []).map((m) => m.toLowerCase());

  const hasPackageTargets = targetPackages.length > 0;
  const hasMysteryTargets = targetMysteries.length > 0;

  if (!hasPackageTargets && !hasMysteryTargets) {
    return true;
  }

  let packageMatch = false;
  if (options.tier && hasPackageTargets) {
    packageMatch = targetPackages.includes(options.tier);
  }

  let mysteryMatch = false;
  if (hasMysteryTargets) {
    const candidates = [
      options.mysteryId,
      options.mysterySlug,
      slugifyMysteryTitle(options.mysteryTitle),
    ]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.toLowerCase());

    mysteryMatch = candidates.some((c) => targetMysteries.includes(c));
  }

  if (discount.applies_to === 'packages') {
    return packageMatch;
  }

  if (discount.applies_to === 'mysteries') {
    return mysteryMatch;
  }

  // 'custom' -> matches if either selected package tier or selected mystery matches
  return packageMatch || mysteryMatch;
}

/**
 * Calculates the discounted amount and savings from a base price.
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discount: Pick<DiscountRecord, 'discount_type' | 'discount_value'> | null | undefined
): {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  hasDiscount: boolean;
} {
  if (!discount || discount.discount_value <= 0 || originalPrice <= 0) {
    return {
      originalPrice,
      finalPrice: originalPrice,
      discountAmount: 0,
      hasDiscount: false,
    };
  }

  let discountAmount = 0;
  if (discount.discount_type === 'percentage') {
    const pct = Math.min(100, Math.max(0, discount.discount_value));
    discountAmount = Math.round((originalPrice * (pct / 100)) * 100) / 100;
  } else {
    discountAmount = Math.min(originalPrice, Math.max(0, discount.discount_value));
  }

  const finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);

  return {
    originalPrice,
    finalPrice,
    discountAmount,
    hasDiscount: finalPrice < originalPrice,
  };
}

/**
 * Finds the best currently active automatic discount for a given tier / mystery.
 */
export function findBestAutoDiscountForTarget(
  discounts: DiscountRecord[],
  originalPrice: number,
  target: {
    tier?: string | null;
    mysteryId?: string | null;
    mysterySlug?: string | null;
    mysteryTitle?: string | null;
  },
  referenceDate: Date = new Date()
): {
  discount: DiscountRecord | null;
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
} {
  let bestDiscount: DiscountRecord | null = null;
  let bestFinalPrice = originalPrice;
  let bestDiscountAmount = 0;

  for (const d of discounts) {
    if (!d.auto_apply) continue;
    if (getDiscountComputedStatus(d, referenceDate) !== 'active') continue;
    if (!doesDiscountApplyToTarget(d, target)) continue;

    const calc = calculateDiscountedPrice(originalPrice, d);
    if (calc.hasDiscount && calc.finalPrice < bestFinalPrice) {
      bestDiscount = d;
      bestFinalPrice = calc.finalPrice;
      bestDiscountAmount = calc.discountAmount;
    }
  }

  return {
    discount: bestDiscount,
    originalPrice,
    finalPrice: bestFinalPrice,
    discountAmount: bestDiscountAmount,
  };
}

export function formatDiscountBadgeText(
  discount: Pick<DiscountRecord, 'discount_type' | 'discount_value'>,
  currencySymbol = '$'
): string {
  if (discount.discount_type === 'percentage') {
    return `${discount.discount_value}% OFF`;
  }
  return `${currencySymbol}${discount.discount_value} OFF`;
}
