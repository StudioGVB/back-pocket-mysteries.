import { NextResponse } from 'next/server';
import { getActiveDiscountsAction } from '@/app/actions/discounts';

export async function GET() {
  try {
    const discounts = await getActiveDiscountsAction();
    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching active discounts:', error);
    return NextResponse.json({ discounts: [] });
  }
}
