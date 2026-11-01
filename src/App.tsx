import { useState } from "react";
import { DebugPanel } from "./views/DebugPanel";
import { CorridorPage } from "./views/CorridorPage";
import { prefetchCities } from "./views/prepareCities";
import { CITIES } from "./views/useScenario";
import { useRoute } from "./shell/useRoute";

// The first city is computed on the main thread at load; the others start in workers now, so they are
// ready by the time anyone switches.
prefetchCities(CITIES.filter((c) => c.ready && c.id !== CITIES[0].id).map((c) => c.id));

// Map and Junction share one page (one scene, one timeline). The engine debug panel stays reachable at #debug.
// Changing city swaps the corridor and runs inside the same page, so the 3D canvas (and its shaders) survive.
export function App() {
  const route = useRoute();
  const [scenario, setScenario] = useState(CITIES[0].id);
  if (route.page === "debug") return <DebugPanel />;
  return <CorridorPage route={route} scenario={scenario} onScenario={setScenario} />;
}
