// A soft radial falloff used for halos (ambulance, lit beacons).
import { CanvasTexture } from "three";

let cached: CanvasTexture | null = null;

export function glowTexture(): CanvasTexture {
  if (cached) return cached;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  cached = new CanvasTexture(c);
  return cached;
}
