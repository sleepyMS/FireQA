"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface CurrentProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

const CurrentProjectContext = createContext<CurrentProjectContextType>({
  projectId: null,
  setProjectId: () => { throw new Error("useCurrentProject must be used within CurrentProjectProvider"); },
});

export function CurrentProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const value = useMemo(() => ({ projectId, setProjectId }), [projectId]);
  return (
    <CurrentProjectContext.Provider value={value}>
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject() {
  return useContext(CurrentProjectContext);
}
