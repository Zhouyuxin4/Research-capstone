import type { BackendState, ExplanationOut } from "../types";
import { AnalogGauge } from "./AnalogGauge";
import { RudderWheel } from "./RudderWheel";
import { ThrottleLever } from "./ThrottleLever";
import { WarningLight } from "./WarningLight";

export function ControlPanel({
  backendState,
  localRudder,
  explanations,
}: {
  backendState: BackendState | null;
  localRudder: number;
  explanations: ExplanationOut[];
}) {
  const tug = backendState?.agents?.tugboat ?? {};
  const env = backendState?.environment ?? {};
  const metrics = backendState?.global_metrics ?? {};
  const events = backendState?.active_events ?? {};

  const speed = (tug as any).speed ?? 0;
  const heading = (tug as any).heading ?? 0;
  const rpm = (speed / 14) * 3000;
  const engOk = ((metrics as any).engine_status ?? 1) > 0;
  const oilP = engOk ? 78 : 14;
  const waterT = 160 + speed * 5 + (!engOk ? 60 : 0);
  const zone = (env as any).zone ?? "open_water";

  const hasEmergency = explanations.some(
    (e) => e.rule_id?.includes("emergency") || e.rule_id?.includes("collision") || e.rule_id?.includes("engine"),
  );
  const hasSafety = explanations.some(
    (e) => e.rule_id?.includes("fog") || e.rule_id?.includes("wind") || e.rule_id?.includes("visibility"),
  );
  const hasOverspeed = explanations.some((e) => e.rule_id?.includes("speed"));

  const tugboatCargoDistance = (metrics as any).tugboat_cargo_distance ?? 999;

  return (
    <div
      style={{
        background: "#100804",
        border: "0.5px solid #382010",
        borderRadius: 10,
        padding: "10px 16px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            background: "#0a0502",
            border: "0.5px solid #281408",
            borderRadius: 6,
            padding: "8px 10px",
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 8,
          }}
        >
          <WarningLight label="LOW ENG OIL" on={!engOk} />
          <WarningLight label="FLOOD TANK" on={(events as any).escort_collision_risk ?? false} />
          <WarningLight label="HI GEAR TEMP" on={speed > 10} />
          <WarningLight label="HI OIL TEMP" on={hasOverspeed} />
          <WarningLight label="LOW PRESS" on={hasEmergency} color="#ff7010" />
          <WarningLight label="FOG ALERT" on={(events as any).fog_alert ?? hasSafety} color="#6090ff" />
          <WarningLight label="GUIDANCE REQ" on={(events as any).guidance_request_sent ?? false} color="#ffcc10" />
          <WarningLight label="COLLISION" on={hasEmergency} />
          <WarningLight label="ENG FAIL" on={(events as any).engine_failure ?? !engOk} />
          <WarningLight label="OVERSPEED" on={hasOverspeed} color="#ffaa10" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <AnalogGauge label="RPM ×100" value={rpm / 100} min={0} max={30} color="#ff4040" warn={rpm > 2700} size={60} />
          <AnalogGauge label="OIL PSI" value={oilP} min={0} max={100} color="#30cc70" warn={oilP < 25} size={52} />
          <AnalogGauge label="WATER °F" value={waterT} min={100} max={240} color="#3090ee" warn={waterT > 220} size={52} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ThrottleLever speed={speed} />
          <RudderWheel rudder={localRudder} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AnalogGauge label="SPEED kn" value={speed} min={0} max={14} color="#ff4040" warn={speed > 10} size={58} />
            <AnalogGauge
              label="DIST m"
              value={Math.min(tugboatCargoDistance, 200)}
              min={0}
              max={200}
              color={tugboatCargoDistance < 65 ? "#ff4040" : tugboatCargoDistance < 130 ? "#eecc30" : "#30cc70"}
              warn={tugboatCargoDistance < 65}
              size={52}
            />
          </div>
        </div>
        <div style={{ fontSize: 9, color: "#382010", letterSpacing: 0.5 }}>
          ← A / D → RUDDER &nbsp;·&nbsp; W / S THROTTLE &nbsp;·&nbsp; SPACE BRAKE
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <AnalogGauge label="HDG °" value={heading} min={0} max={360} color="#30cc70" size={66} />
        <div style={{ background: "#070402", border: "0.5px solid #281408", borderRadius: 6, padding: "5px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#403020" }}>BEARING</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#c09850", fontFamily: "monospace" }}>{String(Math.round(heading)).padStart(3, "0")}°</div>
        </div>
        <div style={{ background: "#070402", border: "0.5px solid #281408", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#403020" }}>ZONE</div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: zone === "docking_zone" ? "#ff8030" : zone === "harbour_entry" ? "#ffcc30" : "#30cc70",
            }}
          >
            {String(zone).replace(/_/g, " ").toUpperCase()}
          </div>
        </div>
        <div style={{ background: "#070402", border: "0.5px solid #281408", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#403020" }}>TICK</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#c09850", fontFamily: "monospace" }}>{backendState?.time_step ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

