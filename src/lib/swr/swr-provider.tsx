"use client";

import { SWRConfig } from "swr";
import { fetcher } from "./fetcher";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 5_000,
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
