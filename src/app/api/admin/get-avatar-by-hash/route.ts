import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    
    if (!hash) {
      return new NextResponse('Missing hash', { status: 400 });
    }

    const supabase = await createClient();

    const { data } = await supabase
      .from('image_generation_cache')
      .select('image_url')
      .eq('prompt_hash', hash)
      .single();

    if (!data?.image_url) {
      return new NextResponse('Not found', { status: 404 });
    }

    return NextResponse.json({ url: data.image_url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

