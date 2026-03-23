export const CW = 800;
export const CH = 420;

export const MAX_RUDDER = 35;

// Local physics constants (client-side interpolation only)
export const RUDDER_RATE = 0.8;
export const RUDDER_RTN = 0.4;
export const LOCAL_ACCEL = 0.03;
export const LOCAL_DRAG = 0.012;
export const K2PX = 0.55; // knots → pixels/frame for local rendering

export type WeatherKey = "clear" | "fog" | "storm" | "overcast";

export const WEATHER_CFG: Record<
  WeatherKey,
  {
    sky: [string, string];
    water: [string, string];
    fog: number;
    waves: number;
    rain: boolean;
    label: string;
  }
> = {
  clear: {
    sky: ["#5a8faa", "#b8d8f0"],
    water: ["#1a5a7a", "#0d3a55"],
    fog: 0,
    waves: 0.4,
    rain: false,
    label: "☀ Clear",
  },
  fog: {
    sky: ["#8a9aaa", "#aabbc8"],
    water: ["#4a6070", "#2a4050"],
    fog: 0.7,
    waves: 0.5,
    rain: false,
    label: "🌫 Fog",
  },
  storm: {
    sky: ["#2a3040", "#404858"],
    water: ["#1a2a3a", "#0a1a28"],
    fog: 0.2,
    waves: 1.6,
    rain: true,
    label: "⛈ Storm",
  },
  overcast: {
    sky: ["#6a7a88", "#8a9aa8"],
    water: ["#2a4055", "#152535"],
    fog: 0.1,
    waves: 0.7,
    rain: false,
    label: "☁ Overcast",
  },
};

