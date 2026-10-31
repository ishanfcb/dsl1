// Junction label as in city-3d.jpg: a pin on a thin vertical leader, a cyan name line and a white state line.
// The leader is drawn in 3D; the label is a DOM element over the canvas, moved here every frame.
// Pin and leader are blue only while the junction's blue light is on. The text sits on whichever side
// of the pin keeps it off the route. Clicking a pin opens that junction's page.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, Color, Float32BufferAttribute, type LineBasicMaterial, type LineSegments, Vector3 } from "three";
import { blue, type JunctionId, type JunctionState } from "../engine";
import { STATE_TEXT } from "../components/junctionText";
import { scene } from "../styles/tokens";
import { BEACON_HEIGHT } from "./SignalBeacon";
import { stateNow, useSceneData } from "./SceneData";
import { useSceneView } from "./View";
import { toWorld } from "./world";

const PIN_HEIGHT = 70;
/** Lower pin in the Junction close-up, so the label stays inside the frame. */
const PIN_HEIGHT_CLOSE = 38;
/** Label text height below the pin (px), used to test it against the route. */
const LABEL_DROP_PX = 22;

export type PinElements = Partial<Record<JunctionId, HTMLDivElement | null>>;

export function JunctionPin({ junction, labels }: { junction: JunctionId; labels: PinElements }) {
  const data = useSceneData();
  const view = useSceneView();
  const { camera, size } = useThree();
  const line = useRef<LineSegments>(null);
  const last = useRef<{ state: JunctionState | null; left: boolean | null }>({ state: null, left: null });
  const base = useMemo(() => toWorld(data.corridor.junctionXY[junction]), [data.corridor, junction]);
  const anchor = useMemo(() => base.clone(), [base]);
  const ahead = useMemo(() => {
    const { route, junctionS } = data.corridor;
    return toWorld(route.at(junctionS[junction] + 100).p);
  }, [data.corridor, junction]);
  const colours = useMemo(() => ({ on: new Color(scene.blue), off: new Color(scene.beaconDim) }), []);
  const tmp = useMemo(() => new Vector3(), []);
  const leader = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute([0, BEACON_HEIGHT + 4, 0, 0, PIN_HEIGHT, 0], 3));
    return g;
  }, []);

  useFrame(() => {
    const el = labels[junction];
    if (!el) return;
    const height = PIN_HEIGHT + (PIN_HEIGHT_CLOSE - PIN_HEIGHT) * view.closeness[junction];
    anchor.setY(height);
    const top = leader.getAttribute("position");
    if (top.getY(1) !== height) {
      top.setY(1, height);
      top.needsUpdate = true;
    }
    const toScreen = (v: Vector3): [number, number] => {
      tmp.copy(v).project(camera);
      return [((tmp.x + 1) / 2) * size.width, ((1 - tmp.y) / 2) * size.height];
    };
    tmp.copy(anchor).project(camera);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
    const [ax, ay] = toScreen(anchor);
    el.style.visibility = visible ? "visible" : "hidden";
    el.style.transform = `translate(${ax}px, ${ay}px)`;

    // Where the route crosses the label's height on screen: put the text on the other side.
    const [bx, by] = toScreen(base);
    const [fx, fy] = toScreen(ahead);
    const routeX = Math.abs(fy - by) < 1e-3 ? Infinity : bx + ((fx - bx) * (ay + LABEL_DROP_PX - by)) / (fy - by);
    const left = routeX > ax;

    const st = stateNow(data).controllers[junction];
    const active = blue(st) !== "off";
    (line.current!.material as LineBasicMaterial).color.copy(active ? colours.on : colours.off);
    if (st.state !== last.current.state || left !== last.current.left) {
      last.current = { state: st.state, left };
      const stateEl = el.querySelector(".pin__state");
      if (stateEl) stateEl.textContent = STATE_TEXT[st.state];
      el.classList.toggle("pin-anchor--active", active);
      el.classList.toggle("pin-anchor--left", left);
    }
  });

  return (
    <lineSegments ref={line} geometry={leader} position={base}>
      <lineBasicMaterial color={scene.beaconDim} transparent opacity={0.9} />
    </lineSegments>
  );
}

/** The DOM half of a pin. Positioned and coloured by JunctionPin. */
export function PinLabel({ junction, name, register }: { junction: JunctionId; name: string; register(el: HTMLDivElement | null): void }) {
  return (
    <div className="pin-anchor" ref={register}>
      <a className="pin" href={`#junction/${junction}`} title="Open the junction view">
        <svg className="pin__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="pin__dot" cx="12" cy="12" r="11" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2" />
        </svg>
        <div className="pin__text">
          <div className="pin__name" style={{ color: scene.labelCyan }}>{`${junction} · ${name}`}</div>
          <div className="pin__state" style={{ color: scene.labelText }} />
        </div>
      </a>
    </div>
  );
}
