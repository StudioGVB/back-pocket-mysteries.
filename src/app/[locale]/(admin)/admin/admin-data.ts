// @ts-nocheck
'use server';

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/utils/supabase/server';
import { readLocalAiLogs, StoredAiUsageLog } from '@/utils/ai-logger';
import { requireAdmin } from '@/utils/admin-auth';

export async function getAdminStats(lastViewStr?: string) {
  const supabase = await createClient();

  // Get succeeded orders
  const { data: orders } = await supabase
    .from('orders')
    .select('amount, status')
    .eq('status', 'succeeded');

  // Get total unique users from orders
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const totalRevenue = orders?.reduce((acc, order) => acc + (order.amount || 0), 0) || 0;
  const salesCount = orders?.length || 0;
  const avgOrderVal = salesCount > 0 ? totalRevenue / salesCount : 0;

  let newUsersCount = 0;
  if (lastViewStr) {
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastViewStr);
    newUsersCount = newUsers || 0;
  }

  return {
    totalRevenue,
    salesCount,
    activeUsers: usersCount || 0,
    newUsersCount,
    avgOrderVal,
  };
}

export async function getRecentTransactions() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, amount, status, created_at, user_id, mystery_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }

  const safeOrders = orders || [];
  if (safeOrders.length === 0) return [];

  const userIds = [...new Set(safeOrders.map(o => o.user_id).filter(Boolean))];
  const mysteryIds = [...new Set(safeOrders.map(o => o.mystery_id).filter(Boolean))];

  let profilesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    if (profiles) profilesMap = profiles.reduce((acc, p) => ({...acc, [p.id]: p.full_name}), {});
  }

  let mysteriesMap: Record<string, string> = {};
  if (mysteryIds.length > 0) {
    const { data: mysteries } = await supabase.from('mysteries').select('id, title').in('id', mysteryIds);
    if (mysteries && mysteries.length > 0) {
      mysteriesMap = mysteries.reduce((acc, m) => ({...acc, [m.id]: m.title}), {});
    } else {
      const { data: bases } = await supabase.from('mystery_bases').select('id, title').in('id', mysteryIds);
      if (bases) mysteriesMap = bases.reduce((acc, b) => ({...acc, [b.id]: b.title}), {});
    }
  }

  return safeOrders.map(o => ({
    ...o,
    profile: { full_name: profilesMap[o.user_id as string] || 'Unknown User' },
    mystery: { title: mysteriesMap[o.mystery_id as string] || 'Unknown Mystery' }
  }));
}

export async function getTopMysteries() {
  const supabase = await createClient();

  // Get sales counts per mystery
  const { data: sales } = await supabase
    .from('orders')
    .select('mystery_id')
    .eq('status', 'succeeded');

  const { data: mysteries } = await supabase
    .from('mysteries')
    .select('id, title')
    .eq('status', 'published');

  // Aggregate sales
  const salesMap = sales?.reduce((acc, s) => {
    acc[s.mystery_id] = (acc[s.mystery_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return mysteries?.map(m => ({
    name: m.title,
    sales: salesMap[m.id] || 0
  })).sort((a, b) => b.sales - a.sales).slice(0, 4) || [];
}

export async function getLeads() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    return [];
  }

  return data || [];
}

export async function getCustomers() {
  const supabase = await createClient();

  // Fetch all profiles without joining user_roles to avoid RLS/schema errors
  const { data, error } = (await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data || [];
}

export async function getAdmins() {
  const supabase = await createClient();

  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', ['admin', 'superadmin', 'super_admin']);

  if (rolesError) {
    console.error('Error fetching admin roles:', rolesError);
  }

  const adminUserIds = rolesData?.map(r => r.user_id).filter(Boolean) || [];

  let data: any[] = [];
  if (adminUserIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', adminUserIds)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching admin profiles:', profilesError);
    } else if (profilesData) {
      data = profilesData.map(p => ({
        ...p,
        user_roles: [{ role: rolesData?.find(r => r.user_id === p.id)?.role || 'admin' }]
      }));
    }
  }

  const admins = data || [];

  // Ensure current user (the owner) is always listed, even if RLS blocks DB insertion or if there's an error
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const isAlreadyListed = admins.some((a: any) => a.id === user.id);
    if (!isAlreadyListed) {
      // Fetch their profile manually
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profile) {
        admins.unshift({
          ...profile,
          user_roles: [{ role: 'superadmin' }]
        });
      } else {
        // Fallback if profile doesn't exist in DB yet
        admins.unshift({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || 'Gabriella Blyth',
          created_at: new Date().toISOString(),
          user_roles: [{ role: 'superadmin' }]
        });
      }
    }
  } else {
    // Ultimate fallback if completely unauthenticated on this server route somehow
    admins.unshift({
      id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      full_name: 'Gabriella Blyth (Owner)',
      created_at: new Date().toISOString(),
      user_roles: [{ role: 'superadmin' }]
    });
  }

  return admins;
}

export async function grantAdminStatus(userId: string, role: string = 'admin') {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('user_roles')
    .upsert({ 
      user_id: userId, 
      role: role.toLowerCase() as any
    }, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}

export async function getEnquiries() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching enquiries:', error);
    if (error.code === 'PGRST205') {
      return [{
        id: 'mock-1',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        message: 'Hello! I am very interested in hosting a 1920s Gatsby style murder mystery for my 30th birthday. We expect around 12 guests. Can you let me know if this is something you can customize for us?',
        status: 'pending',
        created_at: new Date().toISOString()
      }];
    }
    return [];
  }

  return data || [];
}

export async function getLiveAiProviderStatus() {
  await requireAdmin();
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '';
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim() || '';

  const maskKey = (k: string) =>
    k && k.length > 10 ? `${k.slice(0, 6)}••••${k.slice(-4)}` : k ? 'Configured' : 'Missing';

  const googleStatus = {
    connected: false,
    maskedKey: maskKey(googleKey),
    modelsCount: 0,
    activeModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-image'],
    error: null as string | null,
  };

  const elevenStatus = {
    connected: false,
    maskedKey: maskKey(elevenKey),
    tier: 'unknown',
    characterCount: 0,
    characterLimit: 0,
    nextInvoiceCents: 0,
    overageUsd: 0,
    nextResetUnix: null as number | null,
    error: null as string | null,
  };

  await Promise.all([
    (async () => {
      if (!googleKey) {
        googleStatus.error = 'Missing GOOGLE_GENERATIVE_AI_API_KEY';
        return;
      }
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${googleKey}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          googleStatus.connected = true;
          googleStatus.modelsCount = data.models?.length || 0;
        } else {
          googleStatus.error = `HTTP ${res.status}`;
        }
      } catch (e: any) {
        googleStatus.error = e?.message || 'Connection failed';
      }
    })(),
    (async () => {
      if (!elevenKey) {
        elevenStatus.error = 'Missing ELEVENLABS_API_KEY';
        return;
      }
      try {
        const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: { 'xi-api-key': elevenKey },
          cache: 'no-store',
        });
        if (res.ok) {
          const sub = await res.json();
          elevenStatus.connected = true;
          elevenStatus.tier = sub.tier || 'creator';
          elevenStatus.characterCount = sub.character_count || 0;
          elevenStatus.characterLimit = sub.character_limit || 0;
          elevenStatus.nextInvoiceCents = sub.next_invoice?.amount_due_cents || 0;
          elevenStatus.overageUsd = Number(sub.current_overage?.amount || 0);
          elevenStatus.nextResetUnix = sub.next_character_count_reset_unix || null;
        } else {
          elevenStatus.error = `HTTP ${res.status}`;
        }
      } catch (e: any) {
        elevenStatus.error = e?.message || 'Connection failed';
      }
    })(),
  ]);

  return { googleStatus, elevenStatus };
}

export async function getAiCosts(): Promise<StoredAiUsageLog[]> {
  const supabase = await createClient();
  const mergedMap = new Map<string, StoredAiUsageLog>();

  const addLog = (key: string, entry: StoredAiUsageLog) => {
    if (!mergedMap.has(key)) {
      mergedMap.set(key, entry);
    }
  };

  // 1. Read from local persistent JSON log file (`data/ai-usage-logs.json`)
  const localLogs = await readLocalAiLogs();
  for (const log of localLogs) {
    addLog(`local:${log.id}`, log);
  }

  // 2. Read from Supabase `ai_usage_logs` table (if RLS permits)
  try {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      for (const row of data as any[]) {
        addLog(`db:${row.id}`, {
          id: row.id,
          model_name: row.model_name,
          prompt_tokens: Number(row.prompt_tokens || 0),
          completion_tokens: Number(row.completion_tokens || 0),
          cost_usd: Number(row.cost_usd || 0),
          feature_name: row.feature_name,
          mystery_id: row.mystery_id || null,
          user_id: row.user_id || null,
          created_at: row.created_at,
          source: 'logged',
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching ai_usage_logs table:', err);
  }

  // 3. Read synced logs from Supabase Storage (`character-images/system/ai-usage-logs.json`) if present
  try {
    const { data: storageBlob } = await supabase.storage
      .from('character-images')
      .download('system/ai-usage-logs.json');
    if (storageBlob) {
      const parsed = JSON.parse(await storageBlob.text());
      if (Array.isArray(parsed)) {
        for (const log of parsed) {
          addLog(`local:${log.id}`, log);
        }
      }
    }
  } catch {}

  // 4. Discover historical Google Gemini/Imagen generations in Supabase Storage `character-images` bucket
  try {
    const { data: rootFiles } = await supabase.storage
      .from('character-images')
      .list('', { limit: 200 });

    for (const item of rootFiles || []) {
      if (item.id && (item.name.endsWith('.jpg') || item.name.endsWith('.png') || item.name.endsWith('.webp'))) {
        addLog(`storage-avatar:${item.name}`, {
          id: `storage-${item.id}`,
          model_name: 'gemini-2.5-flash-image',
          prompt_tokens: 185,
          completion_tokens: 1290,
          cost_usd: 0.039,
          feature_name: 'generate_guest_avatar',
          mystery_id: null,
          user_id: null,
          created_at: item.created_at || new Date().toISOString(),
          source: 'google_storage',
        });
      } else if (!item.id && item.name !== 'mystery-audio' && item.name !== 'system') {
        const { data: subFiles } = await supabase.storage
          .from('character-images')
          .list(item.name, { limit: 100 });
        for (const sub of subFiles || []) {
          if (sub.id && (sub.name.endsWith('.png') || sub.name.endsWith('.jpg') || sub.name.endsWith('.webp'))) {
            addLog(`storage-char:${item.name}/${sub.name}`, {
              id: `storage-${sub.id || `${item.name}-${sub.name}`}`,
              model_name: 'gemini-2.5-flash-image',
              prompt_tokens: 210,
              completion_tokens: 1290,
              cost_usd: 0.039,
              feature_name: 'generate_character_photo',
              mystery_id: item.name.length === 36 ? item.name : null,
              user_id: null,
              created_at: sub.created_at || new Date().toISOString(),
              source: 'google_storage',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not scan character-images storage for AI costs:', err);
  }

  // 5. Discover generated Clue Images in `public.clues` (base64 inline images)
  try {
    const { data: cluesWithImg } = await supabase
      .from('clues')
      .select('id, title, mystery_id, static_image_url, updated_at, created_at')
      .not('static_image_url', 'is', null);

    for (const c of (cluesWithImg as any[]) || []) {
      if (typeof c.static_image_url === 'string' && c.static_image_url.startsWith('data:image/')) {
        addLog(`clue-img:${c.id}`, {
          id: `clue-img-${c.id}`,
          model_name: 'gemini-2.5-flash-image',
          prompt_tokens: 320,
          completion_tokens: 1290,
          cost_usd: 0.039,
          feature_name: `generate_clue_image (${c.title || 'Clue'})`,
          mystery_id: c.mystery_id || null,
          user_id: null,
          created_at: c.updated_at || c.created_at || new Date().toISOString(),
          source: 'google_storage',
        });
      }
    }
  } catch {}

  // 6. Discover generated Moodboard & CCTV Clue images in `public/moodboard` and `public/clues`
  const localAssetDirs: Array<{ dir: string; feature: string }> = [
    { dir: path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'moodboard', 'lotr'), feature: 'generate_moodboard_image' },
    { dir: path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'clues', 'doa'), feature: 'generate_clue_image' },
  ];
  for (const { dir, feature } of localAssetDirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')) {
          const stat = await fs.stat(path.join(/*turbopackIgnore: true*/ dir, file));
          const label = file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
          addLog(`public-img:${feature}:${file}`, {
            id: `public-${feature}-${file}`,
            model_name: 'gemini-2.5-flash-image',
            prompt_tokens: 240,
            completion_tokens: 1290,
            cost_usd: 0.039,
            feature_name: `${feature} (${label})`,
            mystery_id: null,
            user_id: null,
            created_at: stat.mtime.toISOString(),
            source: 'google_storage',
          });
        }
      }
    } catch {}
  }

  // 7. Fetch live ElevenLabs generation history directly from ElevenLabs API
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (elevenKey) {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/history?page_size=100', {
        headers: { 'xi-api-key': elevenKey },
        cache: 'no-store',
      });
      if (res.ok) {
        const histData = await res.json();
        const items: any[] = histData.history || [];
        // Group consecutive ElevenLabs line syntheses within 45 seconds into logical audio clue generations
        const groups: Array<{
          id: string;
          model: string;
          chars: number;
          lines: number;
          dateUnix: number;
        }> = [];

        for (const item of items) {
          const chars = Math.max(
            0,
            (item.character_count_change_to || 0) - (item.character_count_change_from || 0)
          );
          const model = item.model_id || 'eleven_v3';
          const dateUnix = item.date_unix || Math.floor(Date.now() / 1000);
          const prev = groups[groups.length - 1];

          if (prev && prev.model === model && Math.abs(prev.dateUnix - dateUnix) <= 45) {
            prev.chars += chars;
            prev.lines += 1;
          } else {
            groups.push({
              id: item.history_item_id,
              model,
              chars,
              lines: 1,
              dateUnix,
            });
          }
        }

        for (const g of groups) {
          const ratePer1k = g.model === 'eleven_turbo_v2_5' ? 0.15 : 0.30;
          const cost = (g.chars / 1000) * ratePer1k;
          addLog(`elevenlabs:${g.id}`, {
            id: `el-${g.id}`,
            model_name: `elevenlabs:${g.model}`,
            prompt_tokens: g.chars,
            completion_tokens: g.lines,
            cost_usd: Number(cost.toFixed(6)),
            feature_name: `generate_audio_clue (${g.lines} ${g.lines === 1 ? 'line' : 'lines'})`,
            mystery_id: null,
            user_id: null,
            created_at: new Date(g.dateUnix * 1000).toISOString(),
            source: 'elevenlabs_api',
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch live ElevenLabs history:', err);
    }
  }

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// --- Customer Profile View Data ---

export async function getCustomerProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) console.error('Error fetching customer profile:', error);
  console.log('DEBUG profile:', data);
  return data as any;
}

export async function getCustomerOrders(userId: string) {
  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, amount, status, created_at, mystery_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer orders:', error);
    return [];
  }

  const safeOrders = orders || [];
  
  if (safeOrders.length === 0) return [];

  // Fetch mysteries manually to avoid PGRST200 join errors
  const mysteryIds = [...new Set(safeOrders.map(o => o.mystery_id).filter(Boolean))];
  
  let mysteriesMap: Record<string, string> = {};
  if (mysteryIds.length > 0) {
    // Try mysteries first
    const { data: mysteries } = await supabase
      .from('mysteries')
      .select('id, title')
      .in('id', mysteryIds);
      
    if (mysteries && mysteries.length > 0) {
      mysteriesMap = mysteries.reduce((acc, m) => ({...acc, [m.id]: m.title}), {});
    } else {
      // Fallback to mystery_bases if they are buying bases
      const { data: bases } = await supabase
        .from('mystery_bases')
        .select('id, title')
        .in('id', mysteryIds);
      if (bases) {
        mysteriesMap = bases.reduce((acc, b) => ({...acc, [b.id]: b.title}), {});
      }
    }
  }

  // Attach title back to orders
  return safeOrders.map(o => ({
    ...o,
    mystery: { title: mysteriesMap[o.mystery_id as string] || 'Unknown Mystery' }
  }));
}

export async function getCustomerMysteries(userId: string) {
  const supabase = await createClient();
  const { getCustomerCrmData } = await import('@/app/actions/admin-users');
  const [{ data, error }, crm] = await Promise.all([
    supabase
      .from('mysteries')
      .select('id, title, theme, status, min_players, max_players, current_round, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false }),
    getCustomerCrmData(userId),
  ]);

  if (error) console.error('Error fetching customer mysteries:', error);

  const revokedSet = new Set(crm.revokedMysteryIds || []);
  const roundOverrides = crm.mysteryRoundOverrides || {};
  const map = new Map<string, any>();

  for (const m of (data as any[]) || []) {
    if (revokedSet.has(m.id)) continue;
    map.set(m.id, {
      ...m,
      current_round: roundOverrides[m.id] ?? m.current_round ?? 1,
    });
  }

  for (const gm of crm.giftedMysteries || []) {
    if (revokedSet.has(gm.id)) continue;
    if (!map.has(gm.id)) {
      map.set(gm.id, {
        ...gm,
        current_round: roundOverrides[gm.id] ?? gm.current_round ?? 1,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getGiftableCatalogMysteries() {
  const supabase = await createClient();
  const { CORE_MYSTERY_PACKAGES } = await import('@/utils/discounts');
  const { data, error } = await supabase
    .from('mysteries')
    .select('id, title, theme, status, min_players, max_players')
    .order('status', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching giftable catalog mysteries:', error);
  }

  // Deduplicate by title, preferring published DB mysteries first, then CORE_MYSTERY_PACKAGES
  const seenTitles = new Set<string>();
  const unique: any[] = [];
  for (const m of data || []) {
    const key = (m.title || '').trim().toLowerCase();
    if (!key || seenTitles.has(key)) continue;
    seenTitles.add(key);
    unique.push(m);
  }

  for (const pkg of CORE_MYSTERY_PACKAGES) {
    const key = pkg.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    unique.push({
      id: pkg.id,
      title: pkg.title,
      theme: pkg.theme,
      status: 'published',
      min_players: 8,
      max_players: 12,
    });
  }

  return unique;
}

export async function getCustomerGuests(userId: string) {
  const supabase = await createClient();
  
  // Get manual guests
  const { data: manualGuests } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', userId);

  // Get linked guests
  const { data: linkedConnections } = await (supabase as any)
    .from('guest_connections')
    .select(`
      id,
      profiles!guest_user_id (
        full_name, email, pronouns, avatar_url, avatar_config, character_preferences, bio
      )
    `)
    .eq('host_user_id', userId);

  return {
    manual: (manualGuests as any[]) || [],
    linked: (linkedConnections as any[]) || []
  };
}

export async function getCustomerAiUsage(userId: string) {
  const supabase = await createClient();
  const [allLogs, customerMysteries] = await Promise.all([
    getAiCosts(),
    supabase.from('mysteries').select('id').eq('created_by', userId),
  ]);

  const ownedMysteryIds = new Set((customerMysteries.data || []).map((m: any) => m.id));
  const userLogs = allLogs.filter(
    (log: any) =>
      log.user_id === userId || (log.mystery_id && ownedMysteryIds.has(log.mystery_id))
  );

  const totalPrompt = userLogs.reduce((sum: number, log: any) => sum + (log.prompt_tokens || 0), 0);
  const totalCompletion = userLogs.reduce((sum: number, log: any) => sum + (log.completion_tokens || 0), 0);
  const totalTokens = totalPrompt + totalCompletion;
  const estimatedCost = userLogs.reduce((sum: number, log: any) => sum + (Number(log.cost_usd) || 0), 0);

  return {
    generationsCount: userLogs.length,
    totalTokens,
    estimatedCost,
  };
}
