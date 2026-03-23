import { useCallback, useEffect, useRef, useState } from "react";
import { createBackendClient } from "./backendClient";
import { CH, CW, K2PX, LOCAL_ACCEL, MAX_RUDDER, RUDDER_RATE, RUDDER_RTN, WEATHER_CFG, type WeatherKey } from "./constants";
import { makeLocalState } from "./localState";
import { render } from "./renderer";
import { ControlPanel } from "./components/ControlPanel";
import { ExplanationPanel } from "./components/ExplanationPanel";
import type { BackendState, ExplanationOut, LocalState } from "./types";

const Api = createBackendClient();

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const sessionRef = useRef<string | null>(null);
  const localStateRef = useRef<LocalState | null>(null);
  const keysRef = useRef({ left: false, right: false, fwd: false, rev: false, brake: false });
  const pendingStep = useRef(false);

  const [scenario, setScenario] = useState("default");
  const [weather, setWeather] = useState<WeatherKey>("clear");
  const [backendState, setBackendState] = useState<BackendState | null>(null);
  const [explanations, setExplanations] = useState<ExplanationOut[]>([]);
  const [localRudder, setLocalRudder] = useState(0);
  const [status, setStatus] = useState<"connecting" | "ok" | "error" | "no-backend">("connecting");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const rudderUiRef = useRef({ lastSetAt: 0, lastVal: 0 });

  const connect = useCallback(async (sc: string) => {
    setStatus("connecting");
    try {
      await Api.health();
      if (sessionRef.current) await Api.deleteSession(sessionRef.current).catch(() => {});
      const res = await Api.createSession(sc);
      sessionRef.current = res.session_id;
      setBackendState(res.state);
      localStateRef.current = makeLocalState(res.state);
      setExplanations([]);
      setScore(0);
      setTimeLeft(180);
      setStatus("ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("Backend not available, running in demo mode:", msg);
      localStateRef.current = makeLocalState(null);
      setStatus("no-backend");
    }
  }, []);

  useEffect(() => {
    void connect(scenario);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendStep = useCallback(async () => {
    if (!sessionRef.current || pendingStep.current || status === "no-backend") return;
    pendingStep.current = true;
    const ls = localStateRef.current;
    if (!ls) {
      pendingStep.current = false;
      return;
    }
    try {
      const res = await Api.step(sessionRef.current, {
        target_speed: ls.tug.speed,
        target_heading: ls.tug.heading,
        emergency_stop: keysRef.current.brake && Math.abs(ls.tug.speed) < 0.2,
      });

      setBackendState(res.state);
      setExplanations(res.explanations?.filter((e) => e.triggered) ?? []);

      const bt = res.state?.agents?.tugboat;
      const bc = res.state?.agents?.cargo_ship;
      if (bt && ls) {
        ls.tug.speed = bt.speed;
        ls.tug.heading = bt.heading;
        // Backend currently does not advance positions; keep local kinematics for smooth visuals.
        // (If/when backend becomes authoritative for position, we can reconcile here.)
        ls.zone = res.state?.environment?.zone ?? ls.zone;
      }
      if (bc && ls) {
        ls.cargo.speed = bc.speed;
        ls.cargo.heading = bc.heading;
      }

      if (res.rules_triggered?.length) setScore((s) => Math.max(0, s - res.rules_triggered.length * 2));
      else setScore((s) => s + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("Step failed:", msg);
    }
    pendingStep.current = false;
  }, [status]);

  useEffect(() => {
    const t = window.setInterval(() => void sendStep(), 200);
    return () => window.clearInterval(t);
  }, [sendStep]);

  useEffect(() => {
    if (status !== "ok") return;
    const t = window.setInterval(() => setTimeLeft((tl) => Math.max(0, tl - 1)), 1000);
    return () => window.clearInterval(t);
  }, [status]);

  useEffect(() => {
    const map: Record<string, keyof typeof keysRef.current> = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "fwd",
      w: "fwd",
      arrowdown: "rev",
      s: "rev",
      " ": "brake",
    };

    const dn = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (map[k]) {
        keysRef.current[map[k]] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (map[k]) keysRef.current[map[k]] = false;
    };
    window.addEventListener("keydown", dn, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();

    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      const ls = localStateRef.current;
      if (!ls) return;

      ls.time += 0.016 * dt;

      const k = keysRef.current;
      if (k.left) ls.tug.rudder = Math.max(-MAX_RUDDER, ls.tug.rudder - RUDDER_RATE * dt);
      else if (k.right) ls.tug.rudder = Math.min(MAX_RUDDER, ls.tug.rudder + RUDDER_RATE * dt);
      else
        ls.tug.rudder +=
          ls.tug.rudder > 0
            ? -Math.min(RUDDER_RTN * dt, ls.tug.rudder)
            : ls.tug.rudder < 0
              ? Math.min(RUDDER_RTN * dt, -ls.tug.rudder)
              : 0;

      if (!k.brake) {
        if (k.fwd) ls.tug.speed = Math.min(14, ls.tug.speed + LOCAL_ACCEL * (1 - (ls.tug.speed / 14) * 0.5) * dt);
        else if (k.rev) ls.tug.speed = Math.max(-3, ls.tug.speed - LOCAL_ACCEL * 1.2 * dt);
      } else {
        ls.tug.speed = ls.tug.speed > 0 ? Math.max(0, ls.tug.speed - 0.06 * dt) : Math.min(0, ls.tug.speed + 0.06 * dt);
      }
      const drag = (0.008 + Math.abs(ls.tug.speed) * 0.003) * dt;
      ls.tug.speed = ls.tug.speed > 0 ? Math.max(0, ls.tug.speed - drag) : ls.tug.speed < 0 ? Math.min(0, ls.tug.speed + drag) : 0;

      const turnRate = ls.tug.rudder * Math.abs(ls.tug.speed) * 0.06;
      ls.tug.heading = (ls.tug.heading + turnRate * dt + 360) % 360;
      const rad = (ls.tug.heading * Math.PI) / 180;
      ls.tug.x = Math.max(50, Math.min(3000 - 50, ls.tug.x + ls.tug.speed * K2PX * Math.sin(rad) * dt));
      ls.tug.y = Math.max(500, Math.min(1600 - 200, ls.tug.y - ls.tug.speed * K2PX * Math.cos(rad) * dt));

      [ls.ferry, ...ls.fishers].forEach((v) => {
        const r2 = (v.heading * Math.PI) / 180;
        v.x += v.speed * 0.35 * Math.sin(r2) * dt;
        v.y -= v.speed * 0.35 * Math.cos(r2) * dt;
        v.heading += Math.sin(ls.time * 0.2 + v.x * 0.001) * 0.3 * dt;
        if (v.x < 100) v.heading = 90;
        if (v.x > 2900) v.heading = 270;
        if (v.y < 500) v.heading = 180;
        if (v.y > 1400) v.heading = 0;
      });

      const cr2 = (ls.cargo.heading * Math.PI) / 180;
      ls.cargo.x += ls.cargo.speed * 0.3 * Math.sin(cr2) * dt;
      ls.cargo.y -= ls.cargo.speed * 0.3 * Math.cos(cr2) * dt;

      ls.cam.x += (ls.tug.x - ls.cam.x) * Math.min(0.09 * dt, 1);
      ls.cam.y += (ls.tug.y - ls.cam.y) * Math.min(0.09 * dt, 1);

      render(ctx, ls, weather);
      // Avoid forcing a React render every frame (keyboard feels laggy otherwise)
      const nowMs = performance.now();
      const rounded = Math.round(ls.tug.rudder);
      if ((rounded !== rudderUiRef.current.lastVal && nowMs - rudderUiRef.current.lastSetAt > 50) || nowMs - rudderUiRef.current.lastSetAt > 250) {
        rudderUiRef.current.lastVal = rounded;
        rudderUiRef.current.lastSetAt = nowMs;
        setLocalRudder(rounded);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [weather]);

  const handleScenario = useCallback(
    (sc: string) => {
      setScenario(sc);
      void connect(sc);
    },
    [connect],
  );

  return (
    <div className="appShell" style={{ userSelect: "none" }}>
      <div className="panel topBar">
        <div className="pillRow">
          {Object.entries({ default: "Open Water", fog: "Fog Nav", docking: "Docking", emergency: "Eng Fail" }).map(([k, name]) => (
            <button
              key={k}
              onClick={() => handleScenario(k)}
              className={`pillBtn ${scenario === k ? "pillBtnActive" : ""}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="pillRow">
          {Object.entries(WEATHER_CFG).map(([k, w]) => (
            <button
              key={k}
              onClick={() => setWeather(k as WeatherKey)}
              className={`pillBtn ${weather === k ? "pillBtnActive" : ""}`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="statPills">
          <div className="stat">
            <div className="statLabel">SCORE</div>
            <div className="statValue" style={{ color: "rgba(255, 225, 150, 0.9)" }}>
              {score}
            </div>
          </div>
          <div className="stat">
            <div className="statLabel">TIME</div>
            <div className="statValue" style={{ color: timeLeft < 30 ? "rgba(255, 140, 80, 0.95)" : "rgba(255, 225, 150, 0.9)" }}>
              {timeLeft}s
            </div>
          </div>
          <button onClick={() => void connect(scenario)} className="pillBtn">
            ↺ Restart
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 6 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: status === "ok" ? "#30cc70" : status === "connecting" ? "#ffcc30" : "#cc3020",
                boxShadow: `0 0 16px ${status === "ok" ? "#30cc70" : status === "connecting" ? "#ffcc30" : "#cc3020"}55`,
              }}
            />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              {status === "ok" ? "Backend connected" : status === "connecting" ? "Connecting..." : "Demo mode"}
            </span>
          </div>
        </div>
      </div>

      <div className="panel canvasWrap">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="simCanvas"
        />
        <ExplanationPanel explanations={explanations} />
      </div>

      <div className="panel" style={{ padding: 10 }}>
        <ControlPanel backendState={backendState} localRudder={localRudder} explanations={explanations} />
      </div>

      <div className="footerNote">
        {status === "ok"
          ? `API: ${Api.baseUrl} · Session: ${sessionRef.current?.slice(0, 8)}... · Step every 200ms via POST /sessions/{id}/step`
          : `Start backend: cd backend && uvicorn api:app --reload --port 8000 · Frontend API: ${Api.baseUrl}`}
      </div>
    </div>
  );
}

