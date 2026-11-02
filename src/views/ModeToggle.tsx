// Bottom-left switch between Automated playback and Scroll scrubbing. The only way (with Shift+Space) to change mode.
import { useExplain } from "../components/Explain";
import { explain } from "../components/explanations";
import type { TimelineMode } from "../input/useTimeline";

export function ModeToggle({ mode, playing, onChange }: { mode: TimelineMode; playing: boolean; onChange(mode: TimelineMode): void }) {
  const hover = useExplain({ body: explain.modeToggle });
  return (
    <div className="toggle mode-toggle" role="group" aria-label="Playback" {...hover}>
      <button aria-pressed={mode === "auto"} onClick={() => onChange("auto")}>
        {mode === "auto" && !playing ? "Paused" : "Automated"}
      </button>
      <button aria-pressed={mode === "scroll"} onClick={() => onChange("scroll")}>Scroll</button>
    </div>
  );
}
