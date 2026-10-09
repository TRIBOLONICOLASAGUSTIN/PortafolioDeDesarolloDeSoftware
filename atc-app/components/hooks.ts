'use client';

import { useEffect, useState } from 'react';

/** ¿El usuario pidió "reducir movimiento"? */
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { setR(matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  return r;
}
