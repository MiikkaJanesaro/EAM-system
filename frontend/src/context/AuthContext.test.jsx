import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: { login: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("AuthContext", () => {
  test("käyttäjä on null kun localStoragessa ei ole mitään", () => {
    const { result } = renderAuth();
    expect(result.current.user).toBeNull();
  });

  test("onnistunut login tallentaa käyttäjän ja tokenin", async () => {
    api.login.mockResolvedValue({
      token: "test-token",
      user: { id: "u1", username: "admin", name: "Pääkäyttäjä" },
    });

    const { result } = renderAuth();
    let ok;
    await act(async () => {
      ok = await result.current.login("admin", "admin123");
    });

    expect(ok).toBe(true);
    expect(result.current.user).toEqual({ id: "u1", username: "admin", name: "Pääkäyttäjä" });
    expect(localStorage.getItem("eam_token")).toBe("test-token");
  });

  test("isAdmin on tosi vain admin-roolilla", async () => {
    api.login.mockResolvedValue({
      token: "test-token",
      user: { id: "u2", username: "mekaanikko", role: "mechanic" },
    });

    const { result } = renderAuth();
    expect(result.current.isAdmin).toBe(false);

    await act(async () => {
      await result.current.login("mekaanikko", "salasana");
    });
    expect(result.current.isAdmin).toBe(false);
  });

  test("isAdmin on tosi admin-roolin käyttäjälle", async () => {
    api.login.mockResolvedValue({
      token: "test-token",
      user: { id: "u1", username: "admin", role: "admin" },
    });

    const { result } = renderAuth();
    await act(async () => {
      await result.current.login("admin", "admin123");
    });
    expect(result.current.isAdmin).toBe(true);
  });

  test("epäonnistunut login asettaa virheen eikä kirjaudu sisään", async () => {
    api.login.mockRejectedValue(new Error("Väärä käyttäjätunnus tai salasana."));

    const { result } = renderAuth();
    let ok;
    await act(async () => {
      ok = await result.current.login("admin", "vaarin");
    });

    expect(ok).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe("Väärä käyttäjätunnus tai salasana.");
  });

  test("logout tyhjentää käyttäjän ja localStoragen", async () => {
    api.login.mockResolvedValue({
      token: "test-token",
      user: { id: "u1", username: "admin" },
    });

    const { result } = renderAuth();
    await act(async () => {
      await result.current.login("admin", "admin123");
    });
    expect(result.current.user).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("eam_token")).toBeNull();
  });
});
