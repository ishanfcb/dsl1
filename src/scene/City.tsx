// OSM buildings: one merged mesh of dark boxes and one merged set of thin white edges.
// Merged once per corridor (geo/cityCache), so switching city and back does not rebuild them.
import { useMemo } from "react";
import { cityOf } from "../geo/cityCache";
import { scene } from "../styles/tokens";
import { useSceneData } from "./SceneData";

export function City() {
  const { corridor } = useSceneData();
  const { solids, edges } = useMemo(() => cityOf(corridor), [corridor]);

  return (
    <group>
      <mesh geometry={solids}>
        <meshLambertMaterial color={scene.building} transparent opacity={0.88} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={scene.buildingEdge} transparent opacity={scene.buildingEdgeOpacity} />
      </lineSegments>
    </group>
  );
}
