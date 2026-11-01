// Bottom-right switch between the corridors. A city without its OSM export yet is shown but cannot be picked.
import { CITIES } from "./useScenario";

export function CityToggle({ current, onChange }: { current: string; onChange(id: string): void }) {
  return (
    <div className="toggle city-toggle" role="group" aria-label="City">
      {CITIES.map((c) => (
        <button
          key={c.id}
          aria-pressed={c.id === current}
          disabled={!c.ready}
          title={c.ready ? undefined : "Map not exported yet"}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
