import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
};
