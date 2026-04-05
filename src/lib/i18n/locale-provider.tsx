"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Locale, Messages } from "./messages";
import { ko } from "./ko";
import { en } from "./en";

/** Replace `{key}` placeholders in a translation string with values. */
export function interp(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    template,
  );
}

const LOCALE_COOKIE = "fireqa-locale";
const dictionaries: Record<Locale, Messages> = { ko, en };

interface LocaleContextValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ko",
  t: ko,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document === "undefined") return "ko";
    const saved = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
      ?.split("=")[1];
    return saved === "ko" || saved === "en" ? saved : "ko";
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000`;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
