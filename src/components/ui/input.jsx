import React from "react";
// input component
export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full border border-slate-300 rounded-2xl px-3 py-2 text-sm outline-none
                  focus:ring-2 focus:ring-slate-200 ${className}`}
      {...props}
    />
  );
}
