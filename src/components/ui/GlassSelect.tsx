import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Option {
  value: string;
  label: string;
  sub?: string; // optional subtitle line
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}

// ─── GlassSelect (no search) ─────────────────────────────────────────────────
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
        </div>,        document.body
      )}
    </div>
  );
}

// ─── GlassSearchSelect (with search input inside dropdown) ───────────────────
interface GlassSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;       // button placeholder when nothing selected
  searchPlaceholder?: string; // search input placeholder
  allLabel?: string;          // label for the "all" option (value="")
  disabled?: boolean;
  className?: string;
  loading?: boolean;          // show spinner in list
  onSearch?: (keyword: string) => void; // called on search input change (debounce externally)
}

export function GlassSearchSelect({
  value,
  onChange,
  options,
  placeholder = "-- Chọn --",
  searchPlaceholder = "Tìm theo tên hoặc mã...",
  allLabel = "-- Tất cả --",
  disabled = false,
  className = "",
  loading = false,
  onSearch,
}: GlassSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
    setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

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

  const handleKeyword = (val: string) => {
    setKeyword(val);
    onSearch?.(val);
  };

  // client-side filter when no onSearch provided
  const filtered = onSearch
    ? options
    : options.filter((o) =>
        !keyword.trim() ||
        o.label.toLowerCase().includes(keyword.toLowerCase()) ||
        (o.sub ?? "").toLowerCase().includes(keyword.toLowerCase())
      );

  const handleOpen = () => {
    if (disabled) return;
    updatePos();
    setOpen((p) => !p);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setKeyword("");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm outline-none transition
          bg-slate-800 text-slate-100
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-slate-500 hover:bg-slate-700"}
          ${open ? "border-red-400/50 ring-2 ring-red-400/15" : "border-slate-600"}`}
      >
        <span className={`truncate flex-1 text-left ${value ? "text-slate-100" : "text-slate-400"}`}>
          {value ? (selected?.label ?? value) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); handleSelect(""); }}
            className="ml-auto shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-600 hover:text-white"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <svg className={`ml-auto size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 240), zIndex: 9999 }}
          className="animate-dropdown rounded-lg border border-slate-600 bg-slate-800 shadow-2xl shadow-black/60"
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={keyword}
                onChange={(e) => handleKeyword(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-slate-600 bg-slate-700 py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-red-400/50 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
          </div>
          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {/* All option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition
                ${!value ? "bg-red-500/20 text-red-300 font-medium" : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
            >
              {allLabel}
            </button>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
                <div className="size-4 animate-spin rounded-full border-2 border-slate-600 border-t-red-400" />
                Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Không tìm thấy kết quả</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-xs transition
                    ${opt.value === value
                      ? "bg-red-500/20 text-red-300 font-medium"
                      : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
                >
                  <span className="font-semibold text-sm">{opt.label}</span>
                  {opt.sub && <span className="opacity-60 mt-0.5">{opt.sub}</span>}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
