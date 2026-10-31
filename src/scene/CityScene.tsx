// The one 3D scene. Map and Junction are camera positions in it (Driver will be another); switching pages
// moves the camera and never rebuilds the geometry.
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { JUNCTIONS, type JunctionId } from "../engine";
import { scene } from "../styles/tokens";
import { Ambulance } from "./Ambulance";
import { CameraRig } from "./CameraRig";
import { City } from "./City";
import { Effects } from "./Effects";
import { JunctionMarkings } from "./JunctionMarkings";
import { JunctionPin, PinLabel, type PinElements } from "./JunctionPin";
import { RouteStream } from "./RouteStream";
import { RouteLanes } from "./RouteLanes";
import { Roads } from "./Roads";
import { SceneDataContext, type SceneData } from "./SceneData";
import { SignalBeacon } from "./SignalBeacon";
import { SignalHeads } from "./SignalHeads";
import { TrafficRibbons } from "./TrafficRibbons";
import { TriggerRing } from "./TriggerRing";
import { createView, SceneViewContext } from "./View";

export function CityScene({ data, junctionNames, focus }: {
  data: SceneData;
  junctionNames: Record<JunctionId, string>;
  /** Junction the camera is down at; null for the Map overview. */
  focus: JunctionId | null;
}) {
  const labels = useMemo<PinElements>(() => ({}), []);
  const view = useMemo(createView, []);
  view.focus = focus;
  return (
    <div className="scene">
      <Canvas
        camera={{ fov: 30, near: 5, far: 6000 }}
        dpr={[1, 2]}
        resize={{ debounce: 0 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        style={{ background: scene.ground }}
      >
        <SceneDataContext.Provider value={data}>
        <SceneViewContext.Provider value={view}>
          <color attach="background" args={[scene.ground]} />
          <fog attach="fog" args={[scene.ground, 700, 1900]} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[-400, 900, 300]} intensity={0.9} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <planeGeometry args={[12000, 12000]} />
            <meshBasicMaterial color={scene.ground} />
          </mesh>
          <City />
          <Roads />
          <RouteLanes />
          <TrafficRibbons />
          <RouteStream />
          {JUNCTIONS.map((j) => (
            <group key={j}>
              <TriggerRing junction={j} />
              <JunctionMarkings junction={j} />
              <SignalBeacon junction={j} />
              <SignalHeads junction={j} />
              <JunctionPin junction={j} labels={labels} />
            </group>
          ))}
          <Ambulance />
          <CameraRig />
          <Effects />
        </SceneViewContext.Provider>
        </SceneDataContext.Provider>
      </Canvas>
      {JUNCTIONS.map((j) => (
        <PinLabel key={j} junction={j} name={junctionNames[j]} register={(el) => { labels[j] = el; }} />
      ))}
    </div>
  );
}
