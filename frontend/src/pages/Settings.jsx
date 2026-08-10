import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Modal } from "../components/Modal.jsx";
import { SearchInput } from "../components/SearchInput.jsx";
import { SortableHeader } from "../components/SortableHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTableControls } from "../hooks/useTableControls.js";

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
    <div className="card" style={{ marginBottom: 24, maxWidth: 420, padding: 24 }}>
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
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  function load() {
    if (!isAdmin) return;
    setLoading(true);
    api.listUsers().then(setUsers).finally(() => setLoading(false));
  }

  useEffect(load, [isAdmin]);

  const roleLabel = (u) => (u.role === "admin" ? "Pääkäyttäjä" : "Mekaanikko");
  const { search, setSearch, sortKey, sortDir, toggleSort, items: visibleUsers } = useTableControls(
    users,
    {
      searchFields: ["name", "username", roleLabel],
      sortAccessors: { role: roleLabel },
    }
  );

  if (!isAdmin) return null;

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.createUser(form);
      setShowCreateModal(false);
      setForm(EMPTY_USER_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: 0 }}>
          Käyttäjät
        </h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Lisää käyttäjä
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Ladataan…</div>
      ) : (
        <>
          <div className="list-toolbar" style={{ marginTop: 16 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Hae käyttäjiä…" />
          </div>
          {visibleUsers.length === 0 ? (
            <div className="empty-state">Ei hakua vastaavia käyttäjiä.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortableHeader label="Nimi" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Käyttäjätunnus" sortKey="username" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Rooli" sortKey="role" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr key={u.id} style={{ cursor: "default" }}>
                      <td className="row-title">{u.name}</td>
                      <td className="mono">{u.username}</td>
                      <td>{roleLabel(u)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 10px" }}
                            onClick={() => setEditingUser(u)}
                          >
                            Muokkaa
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: "6px 10px" }}
                              onClick={() => setDeletingUser(u)}
                            >
                              Poista
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <Modal title="Lisää käyttäjä" onClose={() => setShowCreateModal(false)}>
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Peruuta
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Tallennetaan…" : "Luo käyttäjä"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            load();
          }}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={() => {
            setDeletingUser(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user.name, username: user.username, role: user.role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.update("users", user.id, form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Muokkaa käyttäjää: ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        <div className="field">
          <label htmlFor="editUserName">Nimi</label>
          <input
            id="editUserName"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="editUserUsername">Käyttäjätunnus</label>
          <input
            id="editUserUsername"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="editUserRole">Rooli</label>
          <select
            id="editUserRole"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="mechanic">Mekaanikko (rajattu)</option>
            <option value="admin">Pääkäyttäjä (rajoittamaton)</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Peruuta
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Tallennetaan…" : "Tallenna muutokset"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteUserModal({ user, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText === user.username;

  async function handleDelete() {
    if (!canDelete) return;
    setError("");
    setDeleting(true);
    try {
      await api.remove("users", user.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={`Poista käyttäjä: ${user.username}`} onClose={onClose}>
      {error && <div className="login-error">{error}</div>}
      <p>
        Tämä poistaa käyttäjän <strong>{user.name}</strong> ({user.username}) pysyvästi. Käyttäjä
        ei voi enää kirjautua sisään. Toimintoa ei voi perua.
      </p>
      <div className="field">
        <label htmlFor="deleteConfirmText">
          Kirjoita käyttäjätunnus <strong>{user.username}</strong> vahvistaaksesi poiston
        </label>
        <input
          id="deleteConfirmText"
          autoComplete="off"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Peruuta
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={!canDelete || deleting}
          onClick={handleDelete}
        >
          {deleting ? "Poistetaan…" : "Poista pysyvästi"}
        </button>
      </div>
    </Modal>
  );
}
