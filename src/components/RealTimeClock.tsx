// How much real time has passed since the ambulance entered, and how much faster than real time it plays.
import { DataBadge, type DataNode } from "./DataBadge";

const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export function RealTimeClock({ elapsed, compression }: { elapsed: number; compression: DataNode }) {
  return (
    <div>
      <span className="status__label">Real time</span> <span className="status__value">{mmss(elapsed)}</span>
      {" · "}
      <DataBadge node={compression} unit="× faster" digits={0} />
    </div>
  );
}
