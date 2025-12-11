import React from "react";
// button component
export function Button({ children, className = "", variant = "default", size = "md", ...props }) {
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 text-slate-800 hover:bg-slate-50",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-xl",
    md: "px-4 py-2 text-sm rounded-2xl",
    lg: "px-5 py-2.5 text-base rounded-2xl",
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
