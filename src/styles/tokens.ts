// Colour and type tokens shared by the shell and the 3D scene (CLAUDE.md §6).
// Colour carries meaning: blue = ambulance and its signals, amber = general traffic. Everything else is grey.

export const shell = {
  page: "#050506",
  panel: "#131417",
  text: "#EDEDED",
  muted: "#8B9097",
} as const;

export const scene = {
  ground: "#0B0C0E",
  building: "#23262B",
  buildingEdge: "#FFFFFF",
  buildingEdgeOpacity: 0.25,
  road: "#3A3E45",
  roadMajor: "#5F646C",
  blue: "#2F7BFF",
  /** Route dots: blue-white core so they read as points of light. */
  blueCore: "#CFE0FF",
  amber: "#F2B705",
  beaconOff: "#2B2F36",
  /** Blue head when off: a small dim grey dot, a shade lighter than unlit R/A/G lamps. */
  beaconDim: "#555A62",
  /** Lane lines on the route road. */
  laneLine: "#4A4F57",
  /** Stop lines in the Junction close-up. */
  marking: "#FFFFFF",
  /** Signal heads only (CLAUDE.md §6: small red / amber / green dots). */
  signalRed: "#E5484D",
  signalGreen: "#3FB950",
  /** Junction label first line (CLAUDE.md §6: small cyan line). */
  labelCyan: "#5BC8F5",
  labelText: "#FFFFFF",
  /** Distance from the ambulance to the next junction: the dimension line beside the route. */
  distance: "#E5484D",
} as const;

export const fonts = {
  sans: '"EE Helvetica", "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;
