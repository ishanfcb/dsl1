// How much real time has passed since the ambulance entered (CLAUDE.md §2: always shown).
const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

export function RealTimeClock({ elapsed }: { elapsed: number }) {
  return (
    <span className="clock">
      <span className="clock__value">{mmss(elapsed)}</span> real time
    </span>
  );
}
