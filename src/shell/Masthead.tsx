// Centred serif wordmark and the stacked uppercase nav (CLAUDE.md §6).
const PAGES = ["Scenarios", "Map", "Junction", "Driver", "System", "Impact"] as const;
export type Page = (typeof PAGES)[number];

export function Masthead({ active }: { active: Page }) {
  return (
    <header className="masthead">
      <h1 className="wordmark">Emergency Enroute</h1>
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
