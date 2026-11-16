import { MODES, SEEDS, type Mode } from "../types";
import { MODE_LABELS } from "../format";

interface Props {
  seed: number;
  mode: Mode;
  onSeedChange: (seed: number) => void;
  onModeChange: (mode: Mode) => void;
}

export default function TopBar({ seed, mode, onSeedChange, onModeChange }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-5 py-2.5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[13px] font-medium tracking-[0.14em] text-ink">TOKENTRAIL</span>
        <span className="rounded-tt border border-line px-1.5 py-[1px] text-[11px] text-muted">
          Simulation data
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2.5 text-[12px] text-muted">
          Seed
          <span className="relative">
            <select
              value={seed}
              onChange={(e) => onSeedChange(Number(e.target.value))}
              className="h-[28px] appearance-none rounded-tt border border-line bg-raised pr-7 pl-2.5 font-mono text-[12px] text-ink"
            >
              {SEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[9px] text-muted"
            >
              ▾
            </span>
          </span>
        </label>

        <div
          role="radiogroup"
          aria-label="Detection mode"
          className="flex rounded-tt border border-line bg-raised p-[2px]"
        >
          {MODES.map((m) => {
            const active = m === mode;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onModeChange(m)}
                className={
                  "rounded-tt px-2.5 py-[5px] text-[12px] " +
                  (active ? "bg-active font-medium text-ink" : "text-muted hover:text-ink")
                }
              >
                {MODE_LABELS[m]}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
