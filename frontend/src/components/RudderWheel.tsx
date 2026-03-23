import { MAX_RUDDER } from "../constants";

export function RudderWheel({ rudder }: { rudder: number }) {
  const rot = (rudder / MAX_RUDDER) * 128;
  const R = 38;
  const C = 46;
  let arc: React.ReactNode = null;
  if (Math.abs(rudder) > 0.5) {
    const sa = -Math.PI / 2;
    const ea = sa + (rudder / MAX_RUDDER) * Math.PI * 1.4;
    const lg = Math.abs((rudder / MAX_RUDDER) * 1.4) > 1 ? 1 : 0;
    const sx = C + R * Math.cos(sa);
    const sy = C + R * Math.sin(sa);
    const ex = C + R * Math.cos(ea);
    const ey = C + R * Math.sin(ea);
    arc = (
      <path
        d={`M${sx},${sy} A${R},${R} 0 ${lg},${rudder > 0 ? 1 : 0} ${ex},${ey}`}
        fill="none"
        stroke={Math.abs(rudder) > 20 ? "#ff6020" : "#3090ff"}
        strokeWidth={5}
        strokeLinecap="round"
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: 92, height: 92 }}>
        <svg width={92} height={92} style={{ position: "absolute", top: 0, left: 0 }}>
          <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
          {arc}
        </svg>
        <div
          style={{
            position: "absolute",
            top: 5,
            left: 5,
            width: 82,
            height: 82,
            borderRadius: "50%",
            border: "9px solid #4a1e00",
            transform: `rotate(${rot}deg)`,
            transition: "transform 0.05s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <div
              key={a}
              style={{
                position: "absolute",
                width: 3,
                height: 30,
                background: "#7a3010",
                borderRadius: 2,
                transformOrigin: "50% 100%",
                transform: `rotate(${a}deg) translateX(-50%)`,
                left: "50%",
                bottom: "50%",
              }}
            />
          ))}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#c07830",
              border: "2.5px solid #e0a050",
              zIndex: 2,
              position: "relative",
            }}
          />
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#d0a860", fontWeight: 700, letterSpacing: 1 }}>
        {rudder >= 0 ? "+" : ""}
        {Math.round(rudder)}°&nbsp;
        {rudder < -1 ? "◄ PORT" : rudder > 1 ? "STBD ►" : "AMIDSHIPS"}
      </div>
    </div>
  );
}

