import React from "react";
// switch component
export function Switch({ checked, onCheckedChange }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={`w-10 h-6 rounded-full p-0.5 transition-all
        ${checked ? "bg-slate-900" : "bg-slate-300"}`}
      aria-pressed={checked}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full transform transition-transform
          ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}
