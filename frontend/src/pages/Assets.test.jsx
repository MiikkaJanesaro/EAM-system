import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Assets } from "./Assets.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client.js", () => ({
  api: { list: vi.fn() },
}));

const assets = [
  { id: "a1", name: "Trukki TR-102", type: "Trukki", locationId: "loc1", serialNumber: "SN-1", status: "ok" },
  { id: "a2", name: "Kompressori K-4", type: "Kompressori", locationId: "loc1", serialNumber: "SN-2", status: "ok" },
  { id: "a3", name: "Nosturi N-7", type: "Nosturi", locationId: "loc2", serialNumber: "SN-3", status: "ok" },
];
const locations = [
  { id: "loc1", name: "Oulun tehdas" },
  { id: "loc2", name: "Kempeleen varikko" },
];

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ isAdmin: false });
  api.list.mockImplementation((resource) =>
    Promise.resolve(resource === "assets" ? assets : locations)
  );
});

function renderAssets() {
  return render(
    <MemoryRouter>
      <Assets />
    </MemoryRouter>
  );
}

function rowNames() {
  const rows = screen.getAllByRole("row").slice(1); // skip header row
  return rows.map((r) => within(r).getAllByRole("cell")[0].textContent);
}

describe("Assets - haku ja lajittelu", () => {
  test("näyttää kaikki työkoneet aluksi", async () => {
    renderAssets();
    await waitFor(() => expect(screen.getByText("Trukki TR-102")).toBeInTheDocument());
    expect(rowNames()).toEqual(["Trukki TR-102", "Kompressori K-4", "Nosturi N-7"]);
  });

  test("hakukenttä suodattaa nimen mukaan", async () => {
    renderAssets();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Trukki TR-102")).toBeInTheDocument());

    await user.type(screen.getByRole("searchbox", { name: "Hae työkoneita…" }), "kompressori");

    expect(screen.queryByText("Trukki TR-102")).not.toBeInTheDocument();
    expect(screen.getByText("Kompressori K-4")).toBeInTheDocument();
  });

  test("hakukenttä suodattaa myös toimipaikan nimen mukaan", async () => {
    renderAssets();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Trukki TR-102")).toBeInTheDocument());

    await user.type(screen.getByRole("searchbox", { name: "Hae työkoneita…" }), "kempele");

    expect(rowNames()).toEqual(["Nosturi N-7"]);
  });

  test("näyttää tyhjän tilan kun mikään ei täsmää", async () => {
    renderAssets();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Trukki TR-102")).toBeInTheDocument());

    await user.type(screen.getByRole("searchbox", { name: "Hae työkoneita…" }), "ei löydy mitään");

    expect(screen.getByText("Ei hakua vastaavia työkoneita.")).toBeInTheDocument();
  });

  test("otsikon klikkaus lajittelee nimen mukaan nousevasti, uusi klikkaus laskevasti", async () => {
    renderAssets();
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Trukki TR-102")).toBeInTheDocument());

    await user.click(screen.getByRole("columnheader", { name: /nimi/i }));
    expect(rowNames()).toEqual(["Kompressori K-4", "Nosturi N-7", "Trukki TR-102"]);

    await user.click(screen.getByRole("columnheader", { name: /nimi/i }));
    expect(rowNames()).toEqual(["Trukki TR-102", "Nosturi N-7", "Kompressori K-4"]);
  });
});
