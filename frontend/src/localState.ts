import type { BackendState, LocalState } from "./types";

export function makeLocalState(backendState: BackendState | null): LocalState {
  const tug = backendState?.agents?.tugboat ?? {
    position_x: 0,
    position_y: 0,
    heading: 90,
    speed: 0,
  };
  const cargo = backendState?.agents?.cargo_ship ?? {
    position_x: 200,
    position_y: 0,
    heading: 90,
    speed: 4,
  };
  return {
    // Historical: original prototype had a y-offset, keep it so visuals match previous layout.
    tug: { x: tug.position_x, y: tug.position_y + 800, heading: tug.heading, speed: tug.speed, rudder: 0 },
    cargo: { x: cargo.position_x, y: cargo.position_y + 800, heading: cargo.heading, speed: cargo.speed },
    ferry: { x: 300, y: 700, heading: 92, speed: 3.5 },
    fishers: [
      { x: 700, y: 1050, heading: 200, speed: 1.5 },
      { x: 1900, y: 860, heading: 275, speed: 2 },
    ],
    cam: { x: tug.position_x, y: tug.position_y + 800 },
    zone: backendState?.environment?.zone ?? "open_water",
    time: 0,
  };
}

