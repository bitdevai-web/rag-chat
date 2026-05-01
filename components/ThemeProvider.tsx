"use client";
import { createContext, useContext, useEffect } from "react";

// Dark mode removed — app is always light.
type Ctx = { theme: "light" };
const ThemeContext = createContext<Ctx>({ theme: "light" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure dark class is never on <html>
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("cb-theme");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
