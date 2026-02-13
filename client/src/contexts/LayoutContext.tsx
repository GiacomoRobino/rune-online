import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type LayoutMode = "A" | "B" | "C";

interface LayoutContextValue {
  layout: LayoutMode;
  setLayout: (mode: LayoutMode) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

const STORAGE_KEY = "sorcery-layout-mode";

function getInitialLayout(): LayoutMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "A" || stored === "B" || stored === "C") return stored;
  return "A";
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutMode>(getInitialLayout);

  const setLayout = useCallback((mode: LayoutMode) => {
    setLayoutState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
