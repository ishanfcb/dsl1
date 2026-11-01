// Junction page: the shell pieces around the close-up of one junction. The scene and timeline are CorridorPage's.
import type { JunctionId, SimState } from "../engine";
import { DataBadge } from "../components/DataBadge";
import { JunctionDetail } from "../components/JunctionDetail";
import type { ScenarioView } from "./useScenario";

export function JunctionSide({ sc, state, junction }: { sc: ScenarioView; state: Readonly<SimState>; junction: JunctionId }) {
  return (
    <JunctionDetail
      cfg={sc.cfg}
      state={state}
      junction={junction}
      cycle={sc.cycle[junction]}
      queuedBelow={sc.queuedBelow}
      queuedBelowMs={sc.queuedBelowMs}
    />
  );
}

export function JunctionStory({ sc, junction }: { sc: ScenarioView; junction: JunctionId }) {
  // n+1: J2 turns green with a steady blue light while the ambulance approaches J1, and blinks once it passes J1.
  return junction === "J1" ? (
    <>
      The ambulance sends its position and speed every few seconds. Once it is <DataBadge node={sc.triggerEta} unit="s" digits={0} /> from{" "}
      {sc.names.J1}, or within <DataBadge node={sc.triggerDistance} unit="m" digits={0} />, whichever comes first, {sc.names.J1} turns
      green for it, its blue lights blink and every other approach turns red. {sc.names.J2} turns green for it too, with a steady
      blue light, so its queue clears before the ambulance gets there.
    </>
  ) : (
    <>
      {sc.names.J2} turns green for the ambulance, with a steady blue light, as soon as {sc.names.J1} starts blinking, so its queue
      has cleared by the time the ambulance arrives. Its blue lights blink once the ambulance is through {sc.names.J1}.
    </>
  );
}
