import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

interface FlowShellContextValue {
  focused: boolean;
  setFocused: (focused: boolean) => void;
}

const FlowShellContext = createContext<FlowShellContextValue | null>(null);

export function FlowShellProvider({ children }: PropsWithChildren) {
  const [focused, setFocused] = useState(false);
  const value = useMemo(() => ({ focused, setFocused }), [focused]);

  return <FlowShellContext.Provider value={value}>{children}</FlowShellContext.Provider>;
}

export function useFlowShell() {
  const context = useContext(FlowShellContext);
  if (!context) throw new Error('useFlowShell must be used within FlowShellProvider');
  return context;
}

export function useFlowShellFocus(focused: boolean) {
  const context = useContext(FlowShellContext);
  const setFocused = context?.setFocused;

  useEffect(() => {
    if (!setFocused) return;
    setFocused(focused);
    return () => setFocused(false);
  }, [focused, setFocused]);
}
