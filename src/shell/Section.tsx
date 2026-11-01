// A labelled block of the left panel.
import type { ReactNode } from "react";

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3 className="section-label">{label}</h3>
      {children}
    </section>
  );
}
