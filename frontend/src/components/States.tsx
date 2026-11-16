import { ApiHttpError, ApiUnreachableError } from "../api";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="px-4 py-6 text-[12px] text-faint">
      {label}
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="px-4 py-6 text-[12px] text-faint">{message}</div>;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiUnreachableError) return error.message;
  if (error instanceof ApiHttpError) return error.detail;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-l-2 border-danger bg-danger-row px-4 py-3"
    >
      <span className="text-[12px] text-danger">{errorMessage(error)}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-tt border border-line bg-raised px-2.5 py-1 text-[12px] text-ink hover:bg-active"
      >
        Retry
      </button>
    </div>
  );
}
