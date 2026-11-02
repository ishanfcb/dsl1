// Bottom right of the visual, above Automated / Scroll: opens and closes the Sources sheet.
import { useExplain } from "../components/Explain";
import { explain } from "../components/explanations";

export function SourcesToggle({ open, onChange }: { open: boolean; onChange(open: boolean): void }) {
  const hover = useExplain({ body: explain.sourcesToggle });
  return (
    <div className="toggle" role="group" aria-label="Sources" {...hover}>
      <button aria-pressed={open} aria-expanded={open} onClick={() => onChange(!open)}>Sources</button>
    </div>
  );
}
