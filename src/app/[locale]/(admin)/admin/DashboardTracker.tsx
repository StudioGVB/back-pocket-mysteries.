"use client";
import { useEffect } from 'react';

export function DashboardTracker() {
  useEffect(() => {
    const date = new Date();
    date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
    // Set cookie to remember the last time the dashboard was viewed
    // We delay this slightly so it doesn't immediately overwrite the server's read value during rendering,
    // though the server already read the cookie before the page hit the client.
    setTimeout(() => {
      document.cookie = `admin_dashboard_last_view=${new Date().toISOString()};expires=${date.toUTCString()};path=/`;
    }, 1000);
  }, []);

  return null;
}
