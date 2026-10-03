import { NextResponse } from "next/server";
import { createDraft, listClaims } from "@/lib/claim";
import { fail } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const bookId = new URL(request.url).searchParams.get("bookId") ?? "";
    const claims = await listClaims(bookId);
    return NextResponse.json({ ok: true, claims });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const claim = await createDraft(body);
    return NextResponse.json({ ok: true, claim }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
