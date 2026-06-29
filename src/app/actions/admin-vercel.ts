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
