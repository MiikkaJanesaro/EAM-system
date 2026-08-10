import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.jsx";

export function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [workorders, setWorkorders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.list("assets"), api.list("workorders"), api.list("locations")])
      .then(([a, w, l]) => {
        setAssets(a);
        setWorkorders(w);
        setLocations(l);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Ladataan…</div>;

  const okCount = assets.filter((a) => a.status === "ok").length;
  const dueCount = assets.filter((a) => a.status === "maintenance_due").length;
  const overdueCount = assets.filter((a) => a.status === "overdue").length;

  const upcoming = workorders
    .filter((w) => w.kind === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const locationName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const assetName = (id) => assets.find((a) => a.id === id)?.name || "—";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Etusivu</h1>
          <p className="page-subtitle">Yleisnäkymä käynnissä oleviin huoltoihin ja hälytyksiin.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{assets.length}</div>
          <div className="stat-label">Työkoneita yhteensä</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--status-ok)" }}>{okCount}</div>
          <div className="stat-label">Kunnossa</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--status-due)" }}>{dueCount}</div>
          <div className="stat-label">Huolto lähestyy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--status-overdue)" }}>{overdueCount}</div>
          <div className="stat-label">Myöhässä</div>
        </div>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", marginBottom: 12 }}>
        Tulevat ja myöhässä olevat huollot
      </h2>

      {upcoming.length === 0 ? (
        <div className="empty-state">Ei suunniteltuja huoltoja juuri nyt.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Työkone</th>
                <th>Toimenpide</th>
                <th>Ajankohta</th>
                <th>Tila</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((w) => (
                <tr key={w.id} onClick={() => (window.location.href = `/assets/${w.assetId}`)}>
                  <td className="row-title">{assetName(w.assetId)}</td>
                  <td>{w.title}</td>
                  <td className="mono">{w.date}</td>
                  <td>
                    <StatusPill status={w.status === "overdue" ? "overdue" : "maintenance_due"} label={w.status === "overdue" ? "Myöhässä" : "Suunniteltu"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
