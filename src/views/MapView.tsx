// Map page: the shell pieces around the corridor overview. The scene and timeline are CorridorPage's.
import type { JunctionId, SimState } from "../engine";
import { JunctionStatePanel } from "../components/JunctionStatePanel";

export function MapSide({ state, names }: { state: Readonly<SimState>; names: Record<JunctionId, string> }) {
  return (
    <>
      <JunctionStatePanel state={state} names={names} />
      <p className="hint">Select a pin to look closer at a junction.</p>
    </>
  );
}

export function MapStory({ place, destination }: { place: string; destination: string }) {
  return (
    <>
      An ambulance heads for {destination} through {place}'s evening peak. Blue lights at the next two signals warn drivers long before the siren can reach them.
    </>
  );
}
