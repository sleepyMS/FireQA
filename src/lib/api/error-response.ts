import { NextResponse } from "next/server";

export function errorResponse(error: unknown, defaultMessage: string, status = 500) {
  console.error(defaultMessage + ":", error);
  return NextResponse.json(
    { error: defaultMessage },
    { status }
  );
}
