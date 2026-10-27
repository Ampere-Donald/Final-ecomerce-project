import { createContext, useContext } from 'react';

export const MotionContext = createContext({ ready: false, reduced: true, paused: false, toggle() {} });
export const useMotionPreferences = () => useContext(MotionContext);
