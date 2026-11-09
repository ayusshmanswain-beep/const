import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-[2px] px-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-ink text-canvas",
        variant === "secondary" && "border border-line bg-panel",
        variant === "ghost" && "bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
