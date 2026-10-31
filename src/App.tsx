import { DebugPanel } from "./views/DebugPanel";
import { CorridorPage } from "./views/CorridorPage";
import { useRoute } from "./shell/useRoute";

// Map and Junction share one page (one scene, one timeline). The engine debug panel stays reachable at #debug.
export function App() {
  const route = useRoute();
  return route.page === "debug" ? <DebugPanel /> : <CorridorPage route={route} />;
}
