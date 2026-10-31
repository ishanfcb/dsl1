// Bloom for emissive blue and amber only: buildings, edges and roads sit below the threshold.
import { Bloom, EffectComposer } from "@react-three/postprocessing";

/** `?nofx` skips post-processing (for GPUs or capture tools that can't run it). */
const disabled = new URLSearchParams(window.location.search).has("nofx");

export function Effects() {
  if (disabled) return null;
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={1.1} radius={0.75} />
    </EffectComposer>
  );
}
