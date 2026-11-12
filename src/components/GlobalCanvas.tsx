"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

/**
 * Global WebGL context coordinator inspired by the Fizzi blueprint.
 * Ensures page transitions and preview elements share resources gracefully
 * without exhausting WebGL hardware contexts on mobile devices.
 */
interface WebGLContextState {
  activeContextId: string | null;
  registerContext: (id: string) => void;
  releaseContext: (id: string) => void;
}

const WebGLContext = createContext<WebGLContextState>({
  activeContextId: null,
  registerContext: () => {},
  releaseContext: () => {},
});

export function GlobalWebGLProvider({ children }: { children: ReactNode }) {
  const [activeContextId, setActiveContextId] = useState<string | null>(null);

  const registerContext = (id: string) => {
    setActiveContextId(id);
  };

  const releaseContext = (id: string) => {
    setActiveContextId((current) => (current === id ? null : current));
  };

  return (
    <WebGLContext.Provider value={{ activeContextId, registerContext, releaseContext }}>
      {children}
    </WebGLContext.Provider>
  );
}

export function useGlobalWebGL() {
  return useContext(WebGLContext);
}
