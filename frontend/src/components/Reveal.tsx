import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (!entry.isIntersecting) {
          // If it leaves through the top of the viewport, next time it enters it will come from the top
          if (entry.boundingClientRect.y < window.innerHeight / 2) {
            setDirection("down");
          } else {
            setDirection("up");
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px"
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const yOffset = direction === "up" ? "40px" : "-40px";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${yOffset})`,
        filter: isVisible ? "blur(0px)" : "blur(12px)",
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        willChange: "opacity, transform, filter"
      }}
    >
      {children}
    </div>
  );
}
