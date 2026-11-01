// Top of the left panel: the pages as one segmented row (CLAUDE.md §6). Only the built pages are listed.
import { useExplain } from "../components/Explain";
import { explain } from "../components/explanations";

const PAGES = ["Map", "Junction"] as const;
const TIPS = { Map: explain.navMap, Junction: explain.navJunction } as const;
export type Page = (typeof PAGES)[number];

export function Masthead({ active }: { active: Page }) {
  return (
    <header className="masthead">
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
