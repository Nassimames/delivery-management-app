import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

type StateProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function LoadingState({
  title = "Loading",
  description = "Please wait while we prepare this view.",
}: Partial<StateProps> = {}) {
  return (
    <div
      role="status"
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white px-6 py-10 text-center"
    >
      <LoaderCircle aria-hidden="true" className="animate-spin text-brand" size={22} />
      <span className="text-sm font-medium text-ink">{title}</span>
      <span className="text-sm text-muted">{description}</span>
    </div>
  );
}

export function EmptyState({ title, description, children }: StateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-muted">
        <Inbox aria-hidden="true" size={21} strokeWidth={1.8} />
      </span>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      {children}
    </div>
  );
}

export function ErrorState({ title, description, children }: StateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-white px-6 py-10 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-danger">
        <AlertCircle aria-hidden="true" size={21} strokeWidth={1.8} />
      </span>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      {children}
    </div>
  );
}
