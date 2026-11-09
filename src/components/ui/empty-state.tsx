import { Mark } from "@/components/brand/logo";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-8">
      <Mark size={24} />
      <div>
        <p className="text-[14px] text-ink">{title}</p>
        <p className="mt-1 max-w-md text-[13px] leading-5 text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
