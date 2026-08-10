import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.jsx";
import { Modal } from "../components/Modal.jsx";

export function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [location, setLocation] = useState(null);
  const [workorders, setWorkorders] = useState([]);
  const [tab, setTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState(null);
  const [woForm, setWoForm] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.get("assets", id), api.workordersByAsset(id), api.list("locations")])
      .then(([a, w, locs]) => {
        setAsset(a);
        setWorkorders(w);
        setLocation(locs.find((l) => l.id === a.locationId) || null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleSaveAsset(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.update("assets", id, editForm);
      setEditForm(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAsset() {
    if (!confirm(`Poistetaanko ${asset.name} pysyvästi?`)) return;
    await api.remove("assets", id);
    navigate("/assets");
  }

  async function handleSaveWorkorder(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.create("workorders", { ...woForm, assetId: id });
      setWoForm(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-state">Ladataan…</div>;
  if (!asset) return <div className="empty-state">Työkonetta ei löytynyt.</div>;

  const history = workorders.filter((w) => w.kind === "done");
  const scheduled = workorders.filter((w) => w.kind === "scheduled");

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/assets">Työkoneet</Link> / {asset.name}
      </div>

      <div className="detail-header">
        <div className="detail-title-row">
          <h1 className="page-title" style={{ marginBottom: 0 }}>{asset.name}</h1>
          <StatusPill status={asset.status} />
        </div>
        <div className="actions-row">
          <button
            className="btn btn-secondary"
            onClick={() =>
              setEditForm({
                name: asset.name,
                type: asset.type,
                status: asset.status,
                locationId: asset.locationId,
                serialNumber: asset.serialNumber,
                purchaseDate: asset.purchaseDate,
                notes: asset.notes || "",
              })
            }
          >
            Muokkaa
          </button>
          <button className="btn btn-danger" onClick={handleDeleteAsset}>
            Poista
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "info" ? "active" : ""}`} onClick={() => setTab("info")}>
          Tiedot
        </button>
        <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          Huoltohistoria ({history.length})
        </button>
        <button className={`tab ${tab === "scheduled" ? "active" : ""}`} onClick={() => setTab("scheduled")}>
          Määräaikaishuollot ({scheduled.length})
        </button>
      </div>

      {tab === "info" && (
        <div className="card">
          <div className="info-grid">
            <div className="info-item">
              <div className="label">Tyyppi</div>
              <div className="value">{asset.type}</div>
            </div>
            <div className="info-item">
              <div className="label">Toimipaikka</div>
              <div className="value">{location?.name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="label">Sarjanumero</div>
              <div className="value mono">{asset.serialNumber || "—"}</div>
            </div>
            <div className="info-item">
              <div className="label">Hankintapäivä</div>
              <div className="value mono">{asset.purchaseDate || "—"}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "1 / -1" }}>
              <div className="label">Muistiinpanot</div>
              <div className="value">{asset.notes || "Ei muistiinpanoja."}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <WorkorderTable
          items={history}
          emptyText="Ei vielä tehtyjä huoltotöitä."
          onAdd={() => setWoForm({ kind: "done", title: "", description: "", date: "", status: "completed" })}
          addLabel="+ Kirjaa tehty huolto"
        />
      )}

      {tab === "scheduled" && (
        <WorkorderTable
          items={scheduled}
          emptyText="Ei suunniteltuja huoltoja."
          onAdd={() => setWoForm({ kind: "scheduled", title: "", description: "", date: "", status: "scheduled" })}
          addLabel="+ Lisää suunniteltu huolto"
        />
      )}

      {editForm && (
        <Modal title="Muokkaa työkonetta" onClose={() => setEditForm(null)}>
          <form onSubmit={handleSaveAsset}>
            <div className="field">
              <label>Nimi</label>
              <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Tyyppi</label>
              <input required value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
            </div>
            <div className="field">
              <label>Sarjanumero</label>
              <input value={editForm.serialNumber} onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })} />
            </div>
            <div className="field">
              <label>Hankintapäivä</label>
              <input type="date" value={editForm.purchaseDate} onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })} />
            </div>
            <div className="field">
              <label>Tila</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="ok">Kunnossa</option>
                <option value="maintenance_due">Huolto lähestyy</option>
                <option value="overdue">Myöhässä</option>
              </select>
            </div>
            <div className="field">
              <label>Muistiinpanot</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditForm(null)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Tallennetaan…" : "Tallenna muutokset"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {woForm && (
        <Modal
          title={woForm.kind === "done" ? "Kirjaa tehty huolto" : "Lisää suunniteltu huolto"}
          onClose={() => setWoForm(null)}
        >
          <form onSubmit={handleSaveWorkorder}>
            <div className="field">
              <label>Otsikko</label>
              <input required value={woForm.title} onChange={(e) => setWoForm({ ...woForm, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Kuvaus</label>
              <textarea value={woForm.description} onChange={(e) => setWoForm({ ...woForm, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Päivämäärä</label>
              <input required type="date" value={woForm.date} onChange={(e) => setWoForm({ ...woForm, date: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setWoForm(null)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function WorkorderTable({ items, emptyText, onAdd, addLabel }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn btn-secondary" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">{emptyText}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Otsikko</th>
                <th>Kuvaus</th>
                <th>Päivämäärä</th>
                <th>Tila</th>
              </tr>
            </thead>
            <tbody>
              {items
                .slice()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((w) => (
                  <tr key={w.id} style={{ cursor: "default" }}>
                    <td className="row-title">{w.title}</td>
                    <td>{w.description || "—"}</td>
                    <td className="mono">{w.date}</td>
                    <td>{w.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
