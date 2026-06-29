"use server";

export async function getVercelTraffic() {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  
  if (!token) {
    return {
      visitors: 0,
      pageViews: 0,
      isConnected: false,
    };
  }

  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // We fetch visits and visitors for the last 30 days
    // Endpoint may vary, fallback if it fails
    const params = new URLSearchParams({
      teamId: teamId,
      filter: '{}', // default empty filter
    });

    const res = await fetch(`https://api.vercel.com/v1/web-analytics/projects/${projectId}/visits/count?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      console.error('Failed to fetch Vercel Analytics:', await res.text());
      return { visitors: 0, pageViews: 0, isConnected: true, error: true };
    }

    const data = await res.json();
    return {
      visitors: data.visitors || 0,
      pageViews: data.pageviews || 0,
      isConnected: true,
    };
  } catch (err: any) {
    console.error('Vercel API Error:', err);
    return { visitors: 0, pageViews: 0, isConnected: true, error: true };
  }
}

export async function getAnalyticsTimeseries(days = 30) {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  
  if (!token) {
    // Return mock data for UI testing
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 50) + 10,
        pageviews: Math.floor(Math.random() * 100) + 20,
      };
    });
  }

  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

  try {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);
    
    const params = new URLSearchParams({
      teamId,
      from: fromDate.toISOString(),
      to: today.toISOString(),
      environment: 'production',
      groupBy: 'day'
    });

    const res = await fetch(`https://api.vercel.com/v1/web-analytics/projects/${projectId}/visits/aggregate?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      console.error('Failed to fetch Vercel Timeseries:', await res.text());
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.error('Vercel API Error (Timeseries):', err);
    return [];
  }
}

export async function getTopPaths(days = 30) {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    return [
      { key: '/', visitors: 145 },
      { key: '/builder', visitors: 92 },
      { key: '/admin', visitors: 65 },
      { key: '/login', visitors: 40 },
      { key: '/mysteries/murder-on-the-express', visitors: 28 },
    ];
  }

  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

  try {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);
    
    const params = new URLSearchParams({
      teamId,
      from: fromDate.toISOString(),
      to: today.toISOString(),
      environment: 'production',
      groupBy: 'requestPath'
    });

    const res = await fetch(`https://api.vercel.com/v1/web-analytics/projects/${projectId}/visits/aggregate?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    return [];
  }
}

export async function getTopCountries(days = 30) {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  if (!token) {
    return [
      { key: 'GB', visitors: 120 },
      { key: 'US', visitors: 85 },
      { key: 'CA', visitors: 20 },
      { key: 'AU', visitors: 15 },
    ];
  }

  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

  try {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);
    
    const params = new URLSearchParams({
      teamId,
      from: fromDate.toISOString(),
      to: today.toISOString(),
      environment: 'production',
      groupBy: 'country'
    });

    const res = await fetch(`https://api.vercel.com/v1/web-analytics/projects/${projectId}/visits/aggregate?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    return [];
  }
}
