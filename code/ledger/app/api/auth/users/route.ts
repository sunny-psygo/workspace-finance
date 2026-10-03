import { NextResponse } from "next/server";
import { createUser, listUsers, requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireUser(request, ["gm"]);
    const users = await listUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(request, ["gm"]);
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
