"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PageTitleContextValue = { title: string | null; setTitle: (title: string | null) => void };

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>
  );
}

export function usePageTitle(): string | null {
  const ctx = useContext(PageTitleContext);
  return ctx?.title ?? null;
}

export function useSetPageTitle(title: string | null) {
  const ctx = useContext(PageTitleContext);
  const setTitle = ctx?.setTitle;

  useEffect(() => {
    setTitle?.(title);
    return () => setTitle?.(null);
  }, [title, setTitle]);
}
