"use client";

import * as Dialog from "@radix-ui/react-dialog";

import { cn } from "@/lib/cn";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-graphite/30" />
        <Dialog.Content
          className={cn(
            "surface-float fixed left-1/2 top-[12vh] z-50 w-[min(100%-1.5rem,32rem)] -translate-x-1/2 p-5",
            wide && "w-[min(100%-1.5rem,40rem)]",
          )}
        >
          <Dialog.Title className="font-display text-[28px] leading-8 tracking-[-0.015em]">{title}</Dialog.Title>
          {description ? <Dialog.Description className="mt-2 text-[13px] leading-5 text-muted">{description}</Dialog.Description> : null}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-graphite/30" />
        <Dialog.Content className="surface-solid fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col rounded-none p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{description}</p>
          <Dialog.Title className="mt-2 text-[20px] leading-6">{title}</Dialog.Title>
          <div className="mt-5 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
