import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { PayrollError } from "@/lib/payroll";
import {
  bureauCsvTemplate,
  hrCsvTemplate,
  parseBureauTaxCsv,
  parseHrPayrollCsv,
  PayrollCsvError,
} from "@/lib/payroll-csv";

export async function GET() {
  return NextResponse.json({
    ok: true,
    templates: {
      hr: hrCsvTemplate,
      bureau: bureauCsvTemplate,
    },
  });
}

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const body = await request.json();
    const kind = String(body?.kind ?? "");
    const csv = String(body?.csv ?? "");
    if (kind === "hr") {
      return NextResponse.json({ ok: true, rows: parseHrPayrollCsv(csv) });
    }
    if (kind === "bureau") {
      return NextResponse.json({ ok: true, rows: parseBureauTaxCsv(csv) });
    }
    throw new PayrollError("kind 须为 hr 或 bureau。", "PAYROLL_CSV_INVALID", "指定 kind。");
  } catch (error) {
    if (error instanceof PayrollCsvError) {
      return fail(new PayrollError(error.message, error.code, error.next));
    }
    return fail(error);
  }
}
