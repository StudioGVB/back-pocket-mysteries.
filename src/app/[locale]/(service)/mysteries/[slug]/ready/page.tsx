import { redirect } from 'next/navigation';

export const unstable_instant = false;

export default async function CustomerMysteryReadyRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, slug } = await params;
  const resolvedSearch = await searchParams;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(resolvedSearch || {})) {
    if (v) query.set(k, v);
  }
  const qs = query.toString();
  redirect(`/${locale}/account/orders/${slug}${qs ? `?${qs}` : ''}`);
}
