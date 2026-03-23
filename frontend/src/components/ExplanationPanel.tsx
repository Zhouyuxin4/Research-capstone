import type { ExplanationOut } from "../types";

export function ExplanationPanel({ explanations }: { explanations: ExplanationOut[] }) {
  if (!explanations || !explanations.length) return null;
  const catCol: Record<string, string> = { navigation: "#3898ee", safety: "#eebb30", emergency: "#ee3820" };
  return (
    <div style={{ position: "absolute", top: 8, right: 8, width: 210, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
      {explanations.slice(0, 2).map((exp, i) => {
        const cat = (exp.educational_summary?.category as string | undefined) ?? "navigation";
        const col = catCol[cat] ?? "#c09850";
        return (
          <div key={i} style={{ background: "rgba(5,3,1,0.96)", border: `1px solid ${col}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 2 }}>{cat.toUpperCase()} · P{exp.priority}</div>
            <div style={{ fontSize: 10, color: "#c09850", lineHeight: 1.4 }}>{exp.rule_id.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 9, color: "#807050", lineHeight: 1.5, marginTop: 3 }}>{exp.message}</div>
            <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
              {exp.conditions?.slice(0, 3).map((c, j) => (
                <div key={j} style={{ fontSize: 8, display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ color: c.result ? "#40cc80" : "#cc4040", fontWeight: 700 }}>{c.result ? "✓" : "✗"}</span>
                  <span style={{ color: "#6a5a40" }}>
                    {c.field} {c.operator} {String(c.threshold)} (={String(c.actual_value).slice(0, 6)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

