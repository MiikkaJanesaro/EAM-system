import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusPill } from "../components/StatusPill.jsx";
import { Modal } from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = {
  name: "",
  type: "",
  status: "ok",
  locationId: "",
  serialNumber: "",
  purchaseDate: "",
  notes: "",
};

export function Assets() {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  function load() {
    setLoading(true);
    Promise.all([api.list("assets"), api.list("locations")])
      .then(([a, l]) => {
        setAssets(a);
        setLocations(l);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const locationName = (id) => locations.find((l) => l.id === id)?.name || "—";

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.create("assets", form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Työkoneet</h1>
          <p className="page-subtitle">Kaikki rekisteröidyt koneet ja laitteet toimipaikoittain.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Lisää työkone
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Ladataan…</div>
      ) : assets.length === 0 ? (
        <div className="empty-state">
          {isAdmin ? "Ei vielä työkoneita. Lisää ensimmäinen yllä olevasta napista." : "Ei vielä työkoneita."}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Tyyppi</th>
                <th>Toimipaikka</th>
                <th>Sarjanumero</th>
                <th>Tila</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/assets/${a.id}`)}>
                  <td className="row-title">{a.name}</td>
                  <td>{a.type}</td>
                  <td>{locationName(a.locationId)}</td>
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

      {showModal && (
        <Modal title="Lisää työkone" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Nimi</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="esim. Trukki TR-103"
              />
            </div>
            <div className="field">
              <label>Tyyppi</label>
              <input
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="esim. Trukki, Nosturi, Kompressori"
              />
            </div>
            <div className="field">
              <label>Toimipaikka</label>
              <select
                required
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              >
                <option value="">Valitse toimipaikka</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Sarjanumero</label>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Hankintapäivä</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Tila</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ok">Kunnossa</option>
                <option value="maintenance_due">Huolto lähestyy</option>
                <option value="overdue">Myöhässä</option>
              </select>
            </div>
            <div className="field">
              <label>Muistiinpanot</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Tallennetaan…" : "Tallenna työkone"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
