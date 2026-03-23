export function WarningLight({ label, on, color = "#ee2010" }: { label: string; on: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: on ? color : "#160604",
          border: `1.5px solid ${on ? color : "#380e08"}`,
          boxShadow: on ? `0 0 8px ${color},0 0 16px ${color}66` : "none",
          transition: "all 0.1s",
        }}
      />
      <div style={{ fontSize: 7, color: on ? "#ffaaaa" : "#483030", textAlign: "center", maxWidth: 46, lineHeight: 1.2 }}>
        {label}
      </div>
    </div>
  );
}

