// Top of the left panel: the city switch, then the pages as one segmented row under it (CLAUDE.md §6).
// The city is the bigger choice, so it sits above the page. Only the built pages are listed.
import type { ReactNode } from "react";
import { useExplain } from "../components/Explain";
import { explain } from "../components/explanations";

const PAGES = ["Map", "Junction"] as const;
const TIPS = { Map: explain.navMap, Junction: explain.navJunction } as const;
export type Page = (typeof PAGES)[number];

export function Masthead({ active, city }: { active: Page; city?: ReactNode }) {
  return (
    <header className="masthead">
      {city}
      <nav aria-label="Pages">
        <ul className="nav">
          {PAGES.map((p) => <NavItem key={p} page={p} active={p === active} />)}
        </ul>
      </nav>
    </header>
  );
}

function NavItem({ page, active }: { page: Page; active: boolean }) {
  const hover = useExplain({ body: TIPS[page] });
  return (
    <li>
      <a href={`#${page.toLowerCase()}`} aria-current={active ? "page" : undefined} {...hover}>{page}</a>
    </li>
  );
}
