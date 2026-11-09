import { cn } from "@/lib/cn";

const tones = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-olive",
};

export function StatusMark({ tone, label }: { tone: keyof typeof tones; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <span className={cn("h-1.5 w-1.5 shrink-0", tones[tone])} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
