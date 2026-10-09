'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * El número cuenta hasta el valor nuevo cuando cambia `key` (el período): 600 ms con salida suave.
 * Con "reducir movimiento", o si cambia por otra razón (por ejemplo, al registrar algo), cambia de golpe.
 */
export function useCountUp(value: number, key: string, reduce: boolean) {
  const [shown, setShown] = useState(value);
  const lastKey = useRef(key), from = useRef(value);
  useEffect(() => {
    const keyChanged = lastKey.current !== key;
    lastKey.current = key;
    if (!keyChanged || reduce) { from.current = value; setShown(value); return; }
    const a = from.current, b = value, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600), e = 1 - (1 - k) ** 3;
      setShown(Math.round(a + (b - a) * e));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value, key, reduce]);
  return shown;
}
