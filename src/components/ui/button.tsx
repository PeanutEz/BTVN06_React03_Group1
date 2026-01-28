import { cn } from "../../lib/utils";

const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variantStyles: Record<string, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600 disabled:bg-blue-400",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-blue-600 disabled:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-blue-600 disabled:text-slate-400",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
};

export function Button({
  className,
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], loading && "opacity-80", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden />
      )}
      {children}
    </button>
  );
}

export default Button;
