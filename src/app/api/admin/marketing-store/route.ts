import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { executeStoreOperation, StoreOperation } from "@/lib/marketing-store";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as StoreOperation;
    const result = await executeStoreOperation(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: { message: error?.message || "Marketing store error" } },
      { status: 500 }
    );
  }
}
