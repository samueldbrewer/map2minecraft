import { NextRequest, NextResponse } from "next/server";

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8080";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const res = await fetch(`${WORKER_URL}/api/download/${jobId}`);

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="map2minecraft-world.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download" },
      { status: 502 }
    );
  }
}
