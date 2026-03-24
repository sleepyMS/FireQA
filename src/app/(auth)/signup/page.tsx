"use client";

import dynamic from "next/dynamic";

const SignupContent = dynamic(() => import("./signup-form"), { ssr: false });

export default function SignupPage() {
  return <SignupContent />;
}
