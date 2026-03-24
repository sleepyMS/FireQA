"use client";

import dynamic from "next/dynamic";

const LoginContent = dynamic(() => import("./login-form"), { ssr: false });

export default function LoginPage() {
  return <LoginContent />;
}
