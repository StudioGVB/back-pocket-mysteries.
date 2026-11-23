import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { getBufferProfiles } from "@/lib/buffer/client";

export async function GET() {
  try {
    await requireAdmin();
    const hasToken = Boolean(
      process.env.BUFFER_ACCESS_TOKEN || process.env.NEXT_PUBLIC_BUFFER_ACCESS_TOKEN
    );
    if (!hasToken) {
      return NextResponse.json({
        connected: false,
        channels: [],
        message: "BUFFER_ACCESS_TOKEN is not set in .env.local yet.",
      });
    }

    const profiles = await getBufferProfiles();
    return NextResponse.json({
      connected: true,
      channels: profiles,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      channels: [],
      message: error.message || "Unable to connect to Buffer API",
    });
  }
}
