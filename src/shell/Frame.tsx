// A visual held inside the shell like a framed photograph, with the OSM credit when it shows map data.
import type { ReactNode } from "react";

export function Frame({ children, credit }: { children: ReactNode; credit?: string }) {
  return (
    <div className="frame">
      {children}
      {credit && <div className="frame__credit">{credit}</div>}
    </div>
  );
}
