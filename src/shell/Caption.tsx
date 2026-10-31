// Caption under a visual: name on the left, data value on the right, and an optional figure between them.
import type { ReactNode } from "react";

export function Caption({ name, middle, value }: { name: ReactNode; middle?: ReactNode; value: ReactNode }) {
  return (
    <div className="caption">
      <span className="caption__name">{name}</span>
      {middle && <div className="caption__middle">{middle}</div>}
      <span className="caption__value">{value}</span>
    </div>
  );
}
