import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_USER_FORM = { username: "", password: "", name: "", role: "mechanic" };

export function Settings() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Asetukset</h1>
          <p className="page-subtitle">Oma tili ja käyttäjien hallinta.</p>
        </div>
      </div>

      <ChangePasswordCard />
      <UserManagementCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("Uudet salasanat eivät täsmää.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24, maxWidth: 420 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", marginTop: 0 }}>
        Vaihda salasana
      </h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-error" style={{ color: "var(--ok, green)" }}>Salasana vaihdettu.</div>}

        <div className="field">
          <label htmlFor="currentPassword">Nykyinen salasana</label>
          <input
            id="currentPassword"
            type="password"
            required
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">Uusi salasana</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Vahvista uusi salasana</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
        </div>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Tallennetaan…" : "Vaihda salasana"}
        </button>
      </form>
    </div>
  );
}

function UserManagementCard() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    if (!isAdmin) return;
    setLoading(true);
    api.listUsers().then(setUsers).finally(() => setLoading(false));
  }

  useEffect(load, [isAdmin]);

  if (!isAdmin) return null;

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createUser(form);
      setShowModal(false);
      setForm(EMPTY_USER_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: 0 }}>
          Käyttäjät
        </h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Lisää käyttäjä
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Ladataan…</div>
      ) : (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Nimi</th>
                <th>Käyttäjätunnus</th>
                <th>Rooli</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td className="row-title">{u.name}</td>
                  <td className="mono">{u.username}</td>
                  <td>{u.role === "admin" ? "Pääkäyttäjä" : "Mekaanikko"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Lisää käyttäjä" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            {error && <div className="login-error">{error}</div>}
            <div className="field">
              <label htmlFor="newUserName">Nimi</label>
              <input
                id="newUserName"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="newUserUsername">Käyttäjätunnus</label>
              <input
                id="newUserUsername"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="newUserPassword">Salasana</label>
              <input
                id="newUserPassword"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="newUserRole">Rooli</label>
              <select
                id="newUserRole"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="mechanic">Mekaanikko (rajattu)</option>
                <option value="admin">Pääkäyttäjä (rajoittamaton)</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Tallennetaan…" : "Luo käyttäjä"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
