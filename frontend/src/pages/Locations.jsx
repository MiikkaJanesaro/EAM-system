import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_FORM = { name: "", address: "", area: "" };

export function Locations() {
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  function load() {
    setLoading(true);
    Promise.all([api.list("locations"), api.list("assets")])
      .then(([l, a]) => {
        setLocations(l);
        setAssets(a);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const assetCount = (locId) => assets.filter((a) => a.locationId === locId).length;

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.create("locations", form);
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
          <h1 className="page-title">Toimipaikat</h1>
          <p className="page-subtitle">Tehtaat, varikot ja muut sijainnit, joissa koneita sijaitsee.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Lisää toimipaikka
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Ladataan…</div>
      ) : locations.length === 0 ? (
        <div className="empty-state">Ei vielä toimipaikkoja.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Osoite</th>
                <th>Alue</th>
                <th>Koneita</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id} onClick={() => navigate(`/locations/${l.id}`)}>
                  <td className="row-title">{l.name}</td>
                  <td>{l.address}</td>
                  <td>{l.area}</td>
                  <td>{assetCount(l.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Lisää toimipaikka" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Nimi</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Osoite</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="field">
              <label>Alue</label>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
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
