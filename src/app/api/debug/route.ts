import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch latest mystery
    const { data: mysteries, error: myErr } = await supabase
      .from('mysteries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (myErr) {
      return NextResponse.json({ error: 'Error fetching mysteries: ' + myErr.message }, { status: 500 });
    }

    if (!mysteries || mysteries.length === 0) {
      return NextResponse.json({ mysteries: [] });
    }

    const latestMystery = mysteries[0];

    // 2. Fetch characters
    const { data: characters, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .eq('mystery_id', latestMystery.id);

    if (charErr) {
      return NextResponse.json({ error: 'Error fetching characters: ' + charErr.message }, { status: 500 });
    }

    // 3. Fetch relationships
    const { data: relationships, error: relErr } = await supabase
      .from('relationships')
      .select('*')
      .eq('mystery_id', latestMystery.id);

    if (relErr) {
      return NextResponse.json({ error: 'Error fetching relationships: ' + relErr.message }, { status: 500 });
    }

    // 4. Fetch motives
    const { data: motives, error: motErr } = await supabase
      .from('motives')
      .select('*')
      .eq('mystery_id', latestMystery.id);

    return NextResponse.json({
      mystery: latestMystery,
      charactersCount: characters.length,
      characters: characters.map(c => ({ id: c.id, name: c.name, is_victim: c.is_victim, plot_role: c.plot_role })),
      relationshipsCount: relationships.length,
      relationships,
      motivesCount: motives ? motives.length : 0,
      motives
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
