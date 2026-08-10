import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("eam_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState("");

  const login = useCallback(async (username, password) => {
    setError("");
    try {
      const data = await api.login(username, password);
      localStorage.setItem("eam_token", data.token);
      localStorage.setItem("eam_user", JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || "Kirjautuminen epäonnistui.");
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("eam_token");
    localStorage.removeItem("eam_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth täytyy käyttää AuthProviderin sisällä");
  return ctx;
}
