import React from "react";
// card component
export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 ${className}`}
      {...props}
    />
  );
}
export function CardHeader({ className = "", ...props }) {
  return <div className={`p-4 pb-2 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }) {
  return (
    <div className={`font-semibold text-slate-900 dark:text-slate-50 ${className}`} {...props} />
  );
}
export function CardContent({ className = "", ...props }) {
  return (
    <div
      className={`p-4 pt-2 text-sm text-slate-700 dark:text-slate-200 ${className}`}
      {...props}
    />
  );
}
