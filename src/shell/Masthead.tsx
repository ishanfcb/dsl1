// Top of the left panel: the pages as one segmented row (CLAUDE.md §6). Only the built pages are listed.
const PAGES = ["Map", "Junction"] as const;
export type Page = (typeof PAGES)[number];

export function Masthead({ active }: { active: Page }) {
  return (
    <header className="masthead">
      <nav aria-label="Pages">
        <ul className="nav">
          {PAGES.map((p) => (
            <li key={p}>
              <a href={`#${p.toLowerCase()}`} aria-current={p === active ? "page" : undefined}>{p}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
