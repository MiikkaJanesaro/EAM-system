// Kevyt fetch-kääre backendin kanssa keskusteluun.
// Kehityksessä Vite proxaa /api -> http://localhost:4000 (ks. vite.config.js).
// AWS-tuotannossa aseta VITE_API_URL osoittamaan varsinaiseen API-osoitteeseen
// (esim. Elastic Beanstalk / ECS -kuormantasaajan URL tai API Gatewayn URL).

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("eam_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("eam_token");
    localStorage.removeItem("eam_user");
    window.location.href = "/login";
    throw new Error("Istunto vanhentunut");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Virhe (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),

  list: (resource) => request(`/${resource}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, data) => request(`/${resource}`, { method: "POST", body: data }),
  update: (resource, id, data) => request(`/${resource}/${id}`, { method: "PUT", body: data }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: "DELETE" }),

  workordersByAsset: (assetId) => request(`/workorders?assetId=${assetId}`),

  attachmentUploadUrl: (workorderId, filename, contentType) =>
    request(`/workorders/${workorderId}/attachments/upload-url`, {
      method: "POST",
      body: { filename, contentType },
    }),
  confirmAttachment: (workorderId, key, filename) =>
    request(`/workorders/${workorderId}/attachments`, {
      method: "POST",
      body: { key, filename },
    }),
  deleteAttachment: (workorderId, key) =>
    request(`/workorders/${workorderId}/attachments`, { method: "DELETE", body: { key } }),

  changePassword: (currentPassword, newPassword) =>
    request("/auth/password", { method: "PUT", body: { currentPassword, newPassword } }),
  listUsers: () => request("/users"),
  createUser: (data) => request("/users", { method: "POST", body: data }),
};
