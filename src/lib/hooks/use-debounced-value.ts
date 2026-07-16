"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value (e.g. a search input) so downstream
 * effects/queries only fire after the value has settled for `delayMs`.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
