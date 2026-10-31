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
      name={sc.names[junction]}
      cycle={sc.cycle[junction]}
      queuedBelow={sc.queuedBelow}
      queuedBelowMs={sc.queuedBelowMs}
    />
  );
}

export function JunctionStory({ sc, junction }: { sc: ScenarioView; junction: JunctionId }) {
  // n+1: J2 warns (steady) while the ambulance approaches J1, and takes over (blinking) once it passes J1.
  const lead =
    junction === "J1" ? (
      <>
        When the ambulance comes within <DataBadge node={sc.trigger} unit="m" digits={0} /> of {sc.names.J1}, its blue lights blink
        and every other approach turns red. {sc.names.J2} turns steady blue at the same moment.
      </>
    ) : (
      <>
        {sc.names.J2} turns steady blue as soon as {sc.names.J1} starts blinking, and blinks once the ambulance is through {sc.names.J1}.
      </>
    );
  return (
    <>
      {lead}
      <br />
      Drivers ahead leave the middle lane before the siren is within earshot.
    </>
  );
}
