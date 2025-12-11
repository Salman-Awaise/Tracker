import React from "react";
// slider component
export function Slider({ value = [0], onValueChange, min = 0, max = 100, step = 1 }) {
  const v = value[0];

  return (
    <div className="w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onValueChange && onValueChange([Number(e.target.value)])}
        className="w-full accent-slate-900"
      />
      <div className="text-xs text-slate-500 mt-1">{v}</div>
    </div>
  );
}
