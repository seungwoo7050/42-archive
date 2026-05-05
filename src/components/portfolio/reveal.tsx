"use client";

import { useEffect, useRef, useState, type Ref } from "react";

export function Reveal({
  as = "div",
  children,
  className = "",
  delay = 0,
}: {
  as?: "div" | "li";
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && !("IntersectionObserver" in window),
  );

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const Component = as;

  return (
    <Component
      className={`reveal-item ${visible ? "is-visible" : ""} ${className}`}
      ref={ref as Ref<HTMLDivElement & HTMLLIElement>}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
