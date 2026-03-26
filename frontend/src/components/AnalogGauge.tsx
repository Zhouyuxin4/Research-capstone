export function AnalogGauge({
  label,
  value,
  min = 0,
  max = 12,
  color = "#ff4040",
  warn = false,
  size = 60,
}: {
  label: string;
  value: number | string;
  min?: number;
  max?: number;
  color?: string;
  warn?: boolean;
  size?: number;
}) {
  const v = typeof value === "number" ? value : Number.parseFloat(value) || 0;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const angle = -135 + pct * 270;
  const r = size / 2 - 3;
  const hub = size / 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={size} height={size}>
        <circle cx={hub} cy={hub} r={r} fill="#080604" stroke={warn ? "#aa2010" : "#382010"} strokeWidth={3} />
        {Array.from({ length: 13 }, (_, i) => {
          const a = ((-135 + i * 22.5) * Math.PI) / 180;
          const ri = i % 3 === 0 ? r - 13 : r - 10;
          return (
            <line
              key={i}
              x1={hub + ri * Math.cos(a)}
              y1={hub + ri * Math.sin(a)}
              x2={hub + (r - 4) * Math.cos(a)}
              y2={hub + (r - 4) * Math.sin(a)}
              stroke={i % 3 === 0 ? "#906030" : "#382010"}
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}
        <line
          x1={hub + 7 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y1={hub + 7 * Math.sin(((angle - 90) * Math.PI) / 180)}
          x2={hub + (r - 6) * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={hub + (r - 6) * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke={warn ? "#ff2010" : color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={hub} cy={hub} r={4.5} fill={warn ? "#ff2010" : color} />
      </svg>
      <div style={{ fontSize: 10, fontWeight: 700, color: warn ? "#ff7050" : "#c09850" }}>
        {v.toFixed(v < 100 ? 1 : 0)}
      </div>
      <div style={{ fontSize: 8, color: "#504030", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

