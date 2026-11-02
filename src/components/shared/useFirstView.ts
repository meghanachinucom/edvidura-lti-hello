import { useEffect, useRef, useState } from "react";

export function useFirstView() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const element = ref.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    });
    if (element) observer.observe(element);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);
  return { ref, seen, reduced };
}