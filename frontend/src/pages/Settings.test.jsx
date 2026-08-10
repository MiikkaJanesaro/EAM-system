import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client.js", () => ({
  api: {
    changePassword: vi.fn(),
    listUsers: vi.fn(),
    createUser: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChangePasswordCard", () => {
  test("näyttää virheen jos uudet salasanat eivät täsmää", async () => {
    useAuth.mockReturnValue({ isAdmin: false });
    render(<Settings />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nykyinen salasana"), "admin123");
    await user.type(screen.getByLabelText("Uusi salasana"), "uusisalasana1");
    await user.type(screen.getByLabelText("Vahvista uusi salasana"), "eritekstiä");
    await user.click(screen.getByRole("button", { name: /vaihda salasana/i }));

    expect(screen.getByText("Uudet salasanat eivät täsmää.")).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  test("kutsuu changePassword():ia ja näyttää onnistumisviestin", async () => {
    useAuth.mockReturnValue({ isAdmin: false });
    api.changePassword.mockResolvedValue({ ok: true });
    render(<Settings />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nykyinen salasana"), "admin123");
    await user.type(screen.getByLabelText("Uusi salasana"), "uusisalasana1");
    await user.type(screen.getByLabelText("Vahvista uusi salasana"), "uusisalasana1");
    await user.click(screen.getByRole("button", { name: /vaihda salasana/i }));

    expect(api.changePassword).toHaveBeenCalledWith("admin123", "uusisalasana1");
    await waitFor(() => expect(screen.getByText("Salasana vaihdettu.")).toBeInTheDocument());
  });

  test("näyttää palvelimen virheviestin epäonnistuessa", async () => {
    useAuth.mockReturnValue({ isAdmin: false });
    api.changePassword.mockRejectedValue(new Error("Nykyinen salasana on väärä."));
    render(<Settings />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nykyinen salasana"), "vaarin");
    await user.type(screen.getByLabelText("Uusi salasana"), "uusisalasana1");
    await user.type(screen.getByLabelText("Vahvista uusi salasana"), "uusisalasana1");
    await user.click(screen.getByRole("button", { name: /vaihda salasana/i }));

    await waitFor(() =>
      expect(screen.getByText("Nykyinen salasana on väärä.")).toBeInTheDocument()
    );
  });
});

describe("UserManagementCard", () => {
  test("ei näytä käyttäjienhallintaa mekaanikolle", () => {
    useAuth.mockReturnValue({ isAdmin: false });
    render(<Settings />);
    expect(screen.queryByText("Käyttäjät")).not.toBeInTheDocument();
  });

  test("admin näkee käyttäjälistan", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u1", username: "admin", name: "Pääkäyttäjä", role: "admin" },
      { id: "u2", username: "mekaanikko1", name: "Matti Mekaanikko", role: "mechanic" },
    ]);
    render(<Settings />);

    await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
    expect(screen.getByText("mekaanikko1")).toBeInTheDocument();
    expect(screen.getByText("Mekaanikko")).toBeInTheDocument();
  });

  test("admin voi luoda uuden käyttäjän", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([]);
    api.createUser.mockResolvedValue({ id: "u3", username: "uusi", role: "mechanic" });
    render(<Settings />);
    const user = userEvent.setup();

    await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: /\+ lisää käyttäjä/i }));

    await user.type(screen.getByLabelText("Nimi"), "Uusi Mekaanikko");
    await user.type(screen.getByLabelText("Käyttäjätunnus"), "uusi");
    await user.type(screen.getByLabelText("Salasana"), "salasana123");
    await user.click(screen.getByRole("button", { name: /luo käyttäjä/i }));

    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({
        username: "uusi",
        password: "salasana123",
        name: "Uusi Mekaanikko",
        role: "mechanic",
      })
    );
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });

  test("ei näytä oman rivin Poista-nappia", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u1", username: "admin", name: "Pääkäyttäjä", role: "admin" },
      { id: "u2", username: "mekaanikko1", name: "Matti Mekaanikko", role: "mechanic" },
    ]);
    render(<Settings />);

    await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole("button", { name: "Poista" });
    expect(deleteButtons.length).toBe(1);
  });

  test("admin voi muokata käyttäjää", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u2", username: "mekaanikko1", name: "Matti Mekaanikko", role: "mechanic" },
    ]);
    api.update.mockResolvedValue({ id: "u2", username: "mekaanikko1", name: "Uusi Nimi", role: "admin" });
    render(<Settings />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText("mekaanikko1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Muokkaa" }));

    const nameInput = screen.getByLabelText("Nimi");
    await user.clear(nameInput);
    await user.type(nameInput, "Uusi Nimi");
    await user.selectOptions(screen.getByLabelText("Rooli"), "admin");
    await user.click(screen.getByRole("button", { name: /tallenna muutokset/i }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith("users", "u2", {
        name: "Uusi Nimi",
        username: "mekaanikko1",
        role: "admin",
      })
    );
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });

  test("poisto-nappi pysyy pois käytöstä kunnes käyttäjätunnus kirjoitetaan oikein", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u2", username: "mekaanikko1", name: "Matti Mekaanikko", role: "mechanic" },
    ]);
    render(<Settings />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText("mekaanikko1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Poista" }));

    const confirmButton = screen.getByRole("button", { name: /poista pysyvästi/i });
    expect(confirmButton).toBeDisabled();

    const confirmInput = screen.getByLabelText(/kirjoita käyttäjätunnus/i);
    await user.type(confirmInput, "vaarateksti");
    expect(confirmButton).toBeDisabled();

    await user.clear(confirmInput);
    await user.type(confirmInput, "mekaanikko1");
    expect(confirmButton).not.toBeDisabled();

    expect(api.remove).not.toHaveBeenCalled();
  });

  test("admin voi poistaa käyttäjän kirjoitettuaan käyttäjätunnuksen oikein", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u2", username: "mekaanikko1", name: "Matti Mekaanikko", role: "mechanic" },
    ]);
    api.remove.mockResolvedValue(null);
    render(<Settings />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText("mekaanikko1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Poista" }));
    await user.type(screen.getByLabelText(/kirjoita käyttäjätunnus/i), "mekaanikko1");
    await user.click(screen.getByRole("button", { name: /poista pysyvästi/i }));

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("users", "u2"));
    expect(api.listUsers).toHaveBeenCalledTimes(2);
  });

  test("näyttää palvelimen virheen jos poisto epäonnistuu (esim. viimeinen admin)", async () => {
    useAuth.mockReturnValue({ isAdmin: true, user: { id: "u1" } });
    api.listUsers.mockResolvedValue([
      { id: "u2", username: "toinenadmin", name: "Toinen Admin", role: "admin" },
    ]);
    api.remove.mockRejectedValue(new Error("Viimeistä pääkäyttäjää ei voi poistaa."));
    render(<Settings />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByText("toinenadmin")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Poista" }));
    await user.type(screen.getByLabelText(/kirjoita käyttäjätunnus/i), "toinenadmin");
    await user.click(screen.getByRole("button", { name: /poista pysyvästi/i }));

    await waitFor(() =>
      expect(screen.getByText("Viimeistä pääkäyttäjää ei voi poistaa.")).toBeInTheDocument()
    );
  });
});
