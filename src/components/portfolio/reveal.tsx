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
  const Component = as;

  return (
    <Component
      className={`reveal-item is-visible ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
