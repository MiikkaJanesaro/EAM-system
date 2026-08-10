import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.jsx";

export function LocationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("locations", id), api.list("assets")])
      .then(([l, a]) => {
        setLocation(l);
        setAssets(a.filter((asset) => asset.locationId === id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-state">Ladataan…</div>;
  if (!location) return <div className="empty-state">Toimipaikkaa ei löytynyt.</div>;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/locations">Toimipaikat</Link> / {location.name}
      </div>
      <h1 className="page-title">{location.name}</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        {location.address} · {location.area}
      </p>

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", marginBottom: 12 }}>
        Koneet tässä toimipaikassa ({assets.length})
      </h2>

      {assets.length === 0 ? (
        <div className="empty-state">Ei koneita tässä toimipaikassa.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Tyyppi</th>
                <th>Sarjanumero</th>
                <th>Tila</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/assets/${a.id}`)}>
                  <td className="row-title">{a.name}</td>
                  <td>{a.type}</td>
                  <td className="mono">{a.serialNumber}</td>
                  <td>
                    <StatusPill status={a.status} />
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
