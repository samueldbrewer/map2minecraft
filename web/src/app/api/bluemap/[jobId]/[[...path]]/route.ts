import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8080";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; path?: string[] }> }
) {
  const { jobId, path } = await params;
  const filePath = path ? path.join("/") : "";
  const workerPath = filePath
    ? `/api/bluemap/${jobId}/${filePath}`
    : `/api/bluemap/${jobId}`;

  try {
    const res = await fetch(`${WORKER_URL}${workerPath}`);

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
