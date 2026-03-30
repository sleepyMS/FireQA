"use client";

import { useEffect } from "react";
import { useCurrentProject } from "@/lib/current-project-context";

export function SetCurrentProject({ projectId }: { projectId: string }) {
  const { setProjectId } = useCurrentProject();
  useEffect(() => {
    setProjectId(projectId);
  }, [projectId]); // setProjectId is stable (React useState setter)
  return null;
}
