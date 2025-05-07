import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const backendRes = await fetch(`${process.env.BACKEND_URL}/api/pdf/upload`, {
    method: "POST",
    body: formData,
  });

  const text = await backendRes.text();
  return new NextResponse(text, { status: backendRes.status });
}
