"use client";

import { createContext, useContext, useState } from "react";

interface CurrentProjectContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

const CurrentProjectContext = createContext<CurrentProjectContextType>({
  projectId: null,
  setProjectId: () => {},
});

export function CurrentProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  return (
    <CurrentProjectContext.Provider value={{ projectId, setProjectId }}>
      {children}
    </CurrentProjectContext.Provider>
  );
}

export function useCurrentProject() {
  return useContext(CurrentProjectContext);
}
