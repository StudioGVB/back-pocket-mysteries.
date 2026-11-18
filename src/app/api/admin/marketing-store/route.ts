import { NextResponse } from "next/server";
import { executeStoreOperation, StoreOperation } from "@/lib/marketing-store";

export async function POST(request: Request) {
  try {
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
