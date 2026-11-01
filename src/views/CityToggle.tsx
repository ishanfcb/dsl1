// Bottom-right switch between the corridors. A city without its OSM export cannot be picked; one still being
// prepared in the background (engine runs, buildings) shows as preparing and becomes selectable when done.
import { useEffect } from "react";
import { useExplain } from "../components/Explain";
import { explain } from "../components/explanations";
import { useCityReady } from "./prepareCities";
import { CITIES, prewarmScenario } from "./useScenario";

export function CityToggle({ current, onChange }: { current: string; onChange(id: string): void }) {
  const hover = useExplain({ body: explain.cityToggle });
  return (
    <div className="toggle city-toggle" role="group" aria-label="City" {...hover}>
      {CITIES.map((c) => (
        <CityButton key={c.id} city={c} current={c.id === current} onChange={onChange} />
      ))}
    </div>
  );
}

function CityButton({ city, current, onChange }: { city: (typeof CITIES)[number]; current: boolean; onChange(id: string): void }) {
  const computed = useCityReady(city.id);
  useEffect(() => {
    if (computed && !current) prewarmScenario(city.id);
  }, [computed, current, city.id]);
  const ready = city.ready && (computed || current);
  const title = !city.ready ? "Map not exported yet" : !ready ? "Preparing this city…" : undefined;
  return (
    <button aria-pressed={current} disabled={!ready} aria-busy={city.ready && !ready} title={title} onClick={() => onChange(city.id)}>
      {city.label}
    </button>
  );
}
