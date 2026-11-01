// How much real time has passed since the ambulance entered, and how much faster than real time it plays.
import { DataBadge, type DataNode } from "./DataBadge";

const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export function RealTimeClock({ elapsed, compression }: { elapsed: number; compression: DataNode }) {
  return (
    <>
      <div className="row">
        <span className="row__label">Real time</span>
        <span className="row__value pill">{mmss(elapsed)}</span>
      </div>
      <div className="row">
        <span className="row__label">Playback</span>
        <span className="row__value"><DataBadge node={compression} unit="× faster" digits={0} /></span>
      </div>
    </>
  );
}
