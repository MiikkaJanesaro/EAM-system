import { describe, test, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableControls } from "./useTableControls.js";

const items = [
  { id: "1", name: "Trukki TR-102", type: "Trukki" },
  { id: "2", name: "Kompressori K-4", type: "Kompressori" },
  { id: "3", name: "Nosturi N-7", type: "Nosturi" },
];

describe("useTableControls", () => {
  test("palauttaa kaikki rivit kun hakusana on tyhjä", () => {
    const { result } = renderHook(() => useTableControls(items, { searchFields: ["name"] }));
    expect(result.current.items).toEqual(items);
  });

  test("suodattaa hakusanalla, ei huomioi kirjainkokoa", () => {
    const { result } = renderHook(() => useTableControls(items, { searchFields: ["name"] }));
    act(() => result.current.setSearch("trukki"));
    expect(result.current.items).toEqual([items[0]]);
  });

  test("hakee myös funktiokentistä (esim. lasketuista arvoista)", () => {
    const { result } = renderHook(() =>
      useTableControls(items, { searchFields: [(i) => `laskettu-${i.type}`] })
    );
    act(() => result.current.setSearch("laskettu-nosturi"));
    expect(result.current.items).toEqual([items[2]]);
  });

  test("lajittelee nousevasti ensimmäisellä klikkauksella ja laskevasti toisella", () => {
    const { result } = renderHook(() => useTableControls(items, { searchFields: ["name"] }));

    act(() => result.current.toggleSort("name"));
    expect(result.current.items.map((i) => i.name)).toEqual([
      "Kompressori K-4",
      "Nosturi N-7",
      "Trukki TR-102",
    ]);
    expect(result.current.sortDir).toBe("asc");

    act(() => result.current.toggleSort("name"));
    expect(result.current.items.map((i) => i.name)).toEqual([
      "Trukki TR-102",
      "Nosturi N-7",
      "Kompressori K-4",
    ]);
    expect(result.current.sortDir).toBe("desc");
  });

  test("vaihtaa lajittelusaraketta ja nollaa suunnan takaisin nousevaksi", () => {
    const { result } = renderHook(() => useTableControls(items, { searchFields: ["name"] }));
    act(() => result.current.toggleSort("name"));
    act(() => result.current.toggleSort("name"));
    expect(result.current.sortDir).toBe("desc");

    act(() => result.current.toggleSort("type"));
    expect(result.current.sortKey).toBe("type");
    expect(result.current.sortDir).toBe("asc");
  });

  test("lajittelee laskettujen sortAccessors-arvojen mukaan", () => {
    const { result } = renderHook(() =>
      useTableControls(items, {
        searchFields: ["name"],
        sortAccessors: { nameLength: (i) => i.name.length },
      })
    );
    act(() => result.current.toggleSort("nameLength"));
    const lengths = result.current.items.map((i) => i.name.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });
});
