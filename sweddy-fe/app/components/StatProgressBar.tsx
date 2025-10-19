import { useEffect, useRef, useState } from "react";

interface StatProgressBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
}

export default function StatProgressBar({ label, current, target, color }: StatProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCurrentRef = useRef(current);

  useEffect(() => {
    // Detect when current value changes
    if (prevCurrentRef.current !== current && prevCurrentRef.current !== undefined) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1200);
      return () => clearTimeout(timer);
    }
    prevCurrentRef.current = current;
  }, [current]);

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span
          className={`text-sm font-bold px-2 py-0.5 rounded-full transition-all duration-500 ${
            isAnimating ? "scale-110 bg-blue-400/40 text-white" : "bg-white/10 text-slate-100"
          }`}
        >
          {current}/{target}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 border border-white/20 overflow-hidden backdrop-blur-sm">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color} shadow-lg ${
            isAnimating ? "brightness-125 shadow-2xl" : ""
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
