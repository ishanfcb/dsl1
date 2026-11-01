// Map page: the shell pieces around the corridor overview. The scene and timeline are CorridorPage's.
import type { JunctionId, SimState } from "../engine";
import { JunctionStatePanel } from "../components/JunctionStatePanel";

export function MapSide({ state, names }: { state: Readonly<SimState>; names: Record<JunctionId, string> }) {
  return <JunctionStatePanel state={state} names={names} />;
}

export function MapStory({ place, destination, conditions }: { place: string; destination: string; conditions: string }) {
  return (
    <>
      An ambulance heads for {destination} through {place}'s {conditions}. Blue lights at the next two signals warn drivers long before the siren can reach them.
    </>
  );
}
