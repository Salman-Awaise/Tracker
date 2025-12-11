import React from "react";
// textarea component
export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full border border-slate-300 rounded-2xl px-3 py-2 text-sm outline-none
                  focus:ring-2 focus:ring-slate-200 min-h-[96px] ${className}`}
      {...props}
    />
  );
}
