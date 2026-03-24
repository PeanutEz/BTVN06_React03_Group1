import { useRef } from "react";

interface DateInputProps {
  /** ISO date string "YYYY-MM-DD" */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  required?: boolean;
  darkMode?: boolean;
  className?: string;
}

// "YYYY-MM-DD" → "DD/MM/YYYY"
function toDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// "DD/MM/YYYY" → "YYYY-MM-DD" (trả "" nếu chưa đủ)
function fromDisplay(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return "";
  return `${yyyy}-${mm}-${dd}`;
}

// Auto-insert slashes: 16032026 → 16/03/2026
function mask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let result = digits;
  if (digits.length > 2) result = digits.slice(0, 2) + "/" + digits.slice(2);
  if (digits.length > 4) result = result.slice(0, 5) + "/" + result.slice(5);
  return result;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  required,
  darkMode = false,
  className = "",
}: DateInputProps) {
  const nativeRef = useRef<HTMLInputElement>(null);

  const inputClass = darkMode
    ? "w-full rounded-lg border border-white/[0.15] bg-white/[0.08] px-3 py-2 pr-10 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
    : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

  const iconClass = darkMode ? "text-white/40 hover:text-white/80" : "text-slate-400 hover:text-slate-600";

  return (
    <div className={`relative ${className}`}>
      {/* Text input hiển thị dd/mm/yyyy */}
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={toDisplay(value)}
        onChange={(e) => {
          const masked = mask(e.target.value);
          const iso = fromDisplay(masked);
          if (iso) onChange(iso);
          else if (masked.length === 0) onChange("");
        }}
        required={required}
        className={inputClass}
      />

      {/* Icon lịch — click mở native date picker ẩn */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => nativeRef.current?.showPicker?.()}
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${iconClass}`}
        aria-label="Chọn ngày từ lịch"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Native date picker ẩn — chỉ dùng để picker UI */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
        style={{ colorScheme: darkMode ? "dark" : "light" }}
      />
    </div>
  );
}
