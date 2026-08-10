import { describe, test, expect, vi, beforeEach } from "vitest";
import { api } from "./client.js";

function mockFetchOnce(status, body) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("api.login", () => {
  test("ei lähetä Authorization-headeria", async () => {
    mockFetchOnce(200, { token: "abc", user: { id: "u1" } });
    await api.login("admin", "admin123");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body)).toEqual({ username: "admin", password: "admin123" });
  });
});

describe("autentikoidut pyynnöt", () => {
  test("lisää Authorization-headerin kun token on tallessa", async () => {
    localStorage.setItem("eam_token", "test-token");
    mockFetchOnce(200, [{ id: "a1" }]);

    await api.list("assets");

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/assets");
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });
});

describe("virheenkäsittely", () => {
  test("heittää virheen palvelimen error-viestillä kun vastaus ei ole ok", async () => {
    mockFetchOnce(400, { error: "Virheellinen pyyntö" });
    await expect(api.list("assets")).rejects.toThrow("Virheellinen pyyntö");
  });

  test("tyhjentää tokenin ja ohjaa /login:iin kun vastaus on 401", async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: "" };

    localStorage.setItem("eam_token", "vanhentunut");
    localStorage.setItem("eam_user", JSON.stringify({ id: "u1" }));
    mockFetchOnce(401, {});

    await expect(api.list("assets")).rejects.toThrow("Istunto vanhentunut");
    expect(localStorage.getItem("eam_token")).toBeNull();
    expect(localStorage.getItem("eam_user")).toBeNull();
    expect(window.location.href).toBe("/login");

    window.location = originalLocation;
  });

  test("palauttaa null 204-vastaukselle", async () => {
    mockFetchOnce(204, undefined);
    const result = await api.remove("assets", "a1");
    expect(result).toBeNull();
  });
});
