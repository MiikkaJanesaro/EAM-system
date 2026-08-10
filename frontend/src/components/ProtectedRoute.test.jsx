import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { useAuth } from "../context/AuthContext.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

function renderProtected(initialPath = "/suojattu") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Kirjautumissivu</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/suojattu" element={<div>Suojattu sisältö</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  test("ohjaa /login:iin kun käyttäjä ei ole kirjautunut", () => {
    useAuth.mockReturnValue({ user: null });
    renderProtected();
    expect(screen.getByText("Kirjautumissivu")).toBeInTheDocument();
    expect(screen.queryByText("Suojattu sisältö")).not.toBeInTheDocument();
  });

  test("näyttää suojatun sisällön kun käyttäjä on kirjautunut", () => {
    useAuth.mockReturnValue({ user: { id: "u1", username: "admin" } });
    renderProtected();
    expect(screen.getByText("Suojattu sisältö")).toBeInTheDocument();
  });
});
