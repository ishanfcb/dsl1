import { useState } from "react";
import { DebugPanel } from "./views/DebugPanel";
import { CorridorPage } from "./views/CorridorPage";
import { CITIES } from "./views/useScenario";
import { useRoute } from "./shell/useRoute";

// Map and Junction share one page (one scene, one timeline). The engine debug panel stays reachable at #debug.
// Changing city remounts the page: a new corridor, engine runs and timeline.
export function App() {
  const route = useRoute();
  const [scenario, setScenario] = useState(CITIES[0].id);
  if (route.page === "debug") return <DebugPanel />;
  return <CorridorPage key={scenario} route={route} scenario={scenario} onScenario={setScenario} />;
}
