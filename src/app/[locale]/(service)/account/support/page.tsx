import React from 'react';
import { getCustomerTicketsAction } from '@/app/actions/tickets';
import { CustomerSupportClient } from '@/components/support/CustomerSupportClient';

export const unstable_instant = false;

export default async function AccountSupportPage({
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mysteryId?: string }>;
}) {
  const resolvedSearch = await searchParams;
  const { tickets, user, mysteries } = await getCustomerTicketsAction();

  return (
    <div className="w-full">
      <CustomerSupportClient
        initialTickets={tickets}
        user={user}
        mysteries={mysteries}
        defaultMysteryId={resolvedSearch?.mysteryId || null}
        context="account"
      />
    </div>
  );
}
