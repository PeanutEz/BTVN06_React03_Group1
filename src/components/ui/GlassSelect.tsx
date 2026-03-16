import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Option {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}

export function GlassSelect({ value, onChange, options, disabled = false, className = "" }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((o) => o.value === value);

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm outline-none transition
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-slate-500 hover:bg-slate-700"}
          bg-slate-800 text-slate-100
          focus:border-red-400/50 focus:ring-2 focus:ring-red-400/15`}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <svg className={`ml-auto size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
          className="animate-dropdown overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-2xl shadow-black/60"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition
                ${opt.value === value
                  ? "bg-red-500/20 text-red-300 font-medium"
                  : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
