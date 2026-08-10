import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login.jsx";
import { useAuth } from "../context/AuthContext.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

beforeEach(() => {
  navigateMock.mockClear();
});

function renderLogin(authOverrides = {}) {
  useAuth.mockReturnValue({ login: vi.fn().mockResolvedValue(true), error: "", ...authOverrides });
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login-sivu", () => {
  test("kutsuu login():ia lomakkeen kentillä ja ohjaa etusivulle onnistuessa", async () => {
    const login = vi.fn().mockResolvedValue(true);
    renderLogin({ login });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Käyttäjätunnus"), "admin");
    await user.type(screen.getByLabelText("Salasana"), "admin123");
    await user.click(screen.getByRole("button", { name: /kirjaudu sisään/i }));

    expect(login).toHaveBeenCalledWith("admin", "admin123");
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  test("ei ohjaa eteenpäin kun login epäonnistuu", async () => {
    const login = vi.fn().mockResolvedValue(false);
    renderLogin({ login });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Käyttäjätunnus"), "admin");
    await user.type(screen.getByLabelText("Salasana"), "vaarin");
    await user.click(screen.getByRole("button", { name: /kirjaudu sisään/i }));

    expect(navigateMock).not.toHaveBeenCalled();
  });

  test("näyttää virheviestin kun AuthContextissa on virhe", () => {
    renderLogin({ error: "Väärä käyttäjätunnus tai salasana." });
    expect(screen.getByText("Väärä käyttäjätunnus tai salasana.")).toBeInTheDocument();
  });
});
