// OSM buildings: one merged mesh of dark boxes and one merged set of thin white edges.
import { useEffect, useMemo } from "react";
import { buildCity } from "../geo/buildings";
import { scene } from "../styles/tokens";
import { useSceneData } from "./SceneData";

export function City() {
  const { corridor } = useSceneData();
  const { solids, edges } = useMemo(() => buildCity(corridor.footprints), [corridor]);
  useEffect(() => () => { solids.dispose(); edges.dispose(); }, [solids, edges]);

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
