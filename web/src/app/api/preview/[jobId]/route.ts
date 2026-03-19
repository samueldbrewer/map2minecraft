import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const res = await fetch(`${WORKER_URL}/api/preview/${jobId}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 502 }
    );
  }
}
