import { NextResponse } from "next/server";

export function errorResponse(error: unknown, defaultMessage: string, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(`[API Error] ${defaultMessage} | ${name}: ${message}`);
  return NextResponse.json(
    { error: defaultMessage, detail: message },
    { status }
  );
}
