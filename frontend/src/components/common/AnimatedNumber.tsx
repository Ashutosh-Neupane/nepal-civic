import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: string | number;
  duration?: number; // ms
  className?: string;
}

export function AnimatedNumber({ value, duration = 450, className = '' }: AnimatedNumberProps) {
  // If value contains non-digits (e.g. "85%" or text), parse numeric part
  const rawString = String(value);
  const match = rawString.match(/^([\d,.]+)(.*)$/);
  const numericPart = match ? parseFloat(match[1].replace(/,/g, '')) : null;
  const suffix = match ? match[2] : '';

  const [displayValue, setDisplayValue] = useState<number | string>(() => {
    return numericPart !== null && !isNaN(numericPart) ? 0 : value;
  });

  useEffect(() => {
    if (numericPart === null || isNaN(numericPart)) {
      setDisplayValue(value);
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(numericPart);
      return;
    }

    let startTime: number | null = null;
    let animationFrame: number;

    const startVal = typeof displayValue === 'number' ? displayValue : 0;
    const targetVal = numericPart;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetVal);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [numericPart, duration]);

  if (numericPart === null || isNaN(numericPart)) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={className}>
      {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
      {suffix}
    </span>
  );
}
