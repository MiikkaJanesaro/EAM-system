import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.jsx";
import { SearchInput } from "../components/SearchInput.jsx";
import { SortableHeader } from "../components/SortableHeader.jsx";
import { useTableControls } from "../hooks/useTableControls.js";

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

  const { search, setSearch, sortKey, sortDir, toggleSort, items: visibleAssets } = useTableControls(
    assets,
    { searchFields: ["name", "type", "serialNumber"] }
  );

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
        <>
          <div className="list-toolbar">
            <SearchInput value={search} onChange={setSearch} placeholder="Hae koneita…" />
          </div>
          {visibleAssets.length === 0 ? (
            <div className="empty-state">Ei hakua vastaavia koneita.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortableHeader label="Nimi" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Tyyppi" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Sarjanumero" sortKey="serialNumber" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Tila" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {visibleAssets.map((a) => (
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
        </>
      )}
    </div>
  );
}
