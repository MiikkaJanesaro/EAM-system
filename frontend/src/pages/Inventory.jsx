import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";

const EMPTY_FORM = { name: "", sku: "", quantity: 0, unit: "kpl", locationId: "" };

export function Inventory() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.list("inventory"), api.list("locations")])
      .then(([i, l]) => {
        setItems(i);
        setLocations(l);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const locationName = (locId) => locations.find((l) => l.id === locId)?.name || "—";

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item.id);
    setForm({ name: item.name, sku: item.sku, quantity: item.quantity, unit: item.unit, locationId: item.locationId });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      if (editing) {
        await api.update("inventory", editing, payload);
      } else {
        await api.create("inventory", payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Poistetaanko nimike?")) return;
    await api.remove("inventory", id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Varastonhallinta</h1>
          <p className="page-subtitle">Nimikkeet ja saldot toimipaikoittain.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Lisää nimike
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Ladataan…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Ei vielä varastonimikkeitä.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nimike</th>
                <th>SKU</th>
                <th>Saldo</th>
                <th>Toimipaikka</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} onClick={() => openEdit(i)}>
                  <td className="row-title">{i.name}</td>
                  <td className="mono">{i.sku}</td>
                  <td>
                    {i.quantity} {i.unit}
                  </td>
                  <td>{locationName(i.locationId)}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "6px 10px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(i.id);
                      }}
                    >
                      Poista
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editing ? "Muokkaa nimikettä" : "Lisää nimike"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Nimike</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="field">
              <label>Saldo</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="field">
              <label>Yksikkö</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="field">
              <label>Toimipaikka</label>
              <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Valitse toimipaikka</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
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
