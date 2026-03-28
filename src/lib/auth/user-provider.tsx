"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "./get-current-user";

const UserContext = createContext<AuthUser | null>(null);

export function UserProvider({ value, children }: { value: AuthUser; children: React.ReactNode }) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): AuthUser | null {
  return useContext(UserContext);
}
