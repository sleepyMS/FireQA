"use client";

import { cn } from "@/lib/utils";

interface TabNavItem<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface TabNavProps<T extends string> {
  tabs: TabNavItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

export function TabNav<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
}: TabNavProps<T>) {
  return (
    <div className={cn("flex gap-1 border-b", className)}>
      {tabs.map(({ value: tabValue, label }) => (
        <button
          key={tabValue}
          type="button"
          onClick={() => onValueChange(tabValue)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            value === tabValue
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
