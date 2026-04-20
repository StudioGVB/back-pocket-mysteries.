import { createClient } from '@/utils/supabase/server';

export async function getAdminStats() {
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

  return {
    totalRevenue,
    salesCount,
    activeUsers: usersCount || 0,
    avgOrderVal,
  };
}

export async function getRecentTransactions() {
  const supabase = await createClient();

  // Fetch recent orders with customer name and mystery title
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      amount,
      status,
      created_at,
      user_id,
      mystery_id
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // Since nested selects can sometimes fail if relationships aren't perfectly mapped in types,
  // we'll fetch profiles and mysteries separately or use a join if supported.
  // In this schema, we'll try the nested query first as it's cleaner.
  const { data: enrichedOrders } = await supabase
    .from('orders')
    .select(`
      amount,
      status,
      created_at,
      profile:profiles!user_id(full_name),
      mystery:mysteries!mystery_id(title)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return enrichedOrders || [];
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
