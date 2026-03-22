interface TimeSelectProps {
  value: string; // "HH:mm"
  onChange: (val: string) => void;
  className?: string;
  darkMode?: boolean;
}

export function TimeSelect({ value, onChange, darkMode = false }: TimeSelectProps) {
  const [hh, mm] = value ? value.split(":") : ["", ""];

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const selectClass = darkMode
    ? "rounded-lg border border-white/[0.15] bg-slate-800 px-2 py-2 text-sm text-white/90 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 [&>option]:bg-slate-900 cursor-pointer"
    : "rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 cursor-pointer";

  return (
    <div className="flex items-center gap-1.5">
      {/* Hour */}
      <select
        value={hh || ""}
        onChange={(e) => onChange(`${e.target.value}:${mm || "00"}`)}
        className={`flex-1 ${selectClass}`}
        style={{ colorScheme: darkMode ? "dark" : undefined }}
      >
        <option value="">Giờ</option>
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className={`font-bold text-base ${darkMode ? "text-white/50" : "text-slate-400"}`}>:</span>

      {/* Minute */}
      <select
        value={mm || ""}
        onChange={(e) => onChange(`${hh || "00"}:${e.target.value}`)}
        className={`flex-1 ${selectClass}`}
        style={{ colorScheme: darkMode ? "dark" : undefined }}
      >
        <option value="">Phút</option>
        {minutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
