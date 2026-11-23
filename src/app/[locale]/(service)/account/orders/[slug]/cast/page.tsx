import React from 'react';
import CustomerMysteryCastPage from '../../../../mysteries/[slug]/cast/page';

export const unstable_instant = false;

export default async function MyMysteryEditCastPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    checkout?: string;
    orderId?: string;
    payment_intent?: string;
    session_id?: string;
    view?: string;
    edit?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  return (
    <CustomerMysteryCastPage
      params={params}
      searchParams={Promise.resolve({
        ...resolvedSearch,
        view: 'cast',
        edit: '1',
      })}
    />
  );
}
