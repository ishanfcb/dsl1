// The visual: a soft-cornered surface filling the right of the page, with the OSM credit when it shows map data.
import type { ReactNode } from "react";

export function Frame({ children, credit }: { children: ReactNode; credit?: string }) {
  return (
    <div className="frame">
      {children}
      {credit && <div className="frame__credit">{credit}</div>}
    </div>
  );
}
