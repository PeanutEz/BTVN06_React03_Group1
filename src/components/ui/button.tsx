import { cn } from "../../lib/utils";

const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

const variantStyles: Record<string, string> = {
  primary: "bg-primary-500 text-primary-foreground hover:bg-primary-400 focus-visible:outline-primary-300 disabled:bg-primary-300",
  outline: "border border-primary-200/60 bg-white text-[#2f1a12] hover:bg-primary-50 focus-visible:outline-primary-300 disabled:bg-primary-50 disabled:text-primary-300",
  ghost: "text-[#3d2417] hover:bg-primary-50 focus-visible:outline-primary-300 disabled:text-primary-300",
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
