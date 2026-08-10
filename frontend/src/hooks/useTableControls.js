import { useMemo, useState } from "react";

// Hakukenttä + sarakelajittelu listasivuille. searchFields voi sisältää
// kentän nimen tai funktion (esim. lasketut arvot kuten toimipaikan nimi).
// sortAccessors mahdollistaa saman laskettujen arvojen käytön lajittelussa.
export function useTableControls(items, { searchFields = [], sortAccessors = {} } = {}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const result = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = items;
    if (term) {
      filtered = items.filter((item) =>
        searchFields.some((field) => {
          const value = typeof field === "function" ? field(item) : item[field];
          return String(value ?? "").toLowerCase().includes(term);
        })
      );
    }

    if (!sortKey) return filtered;

    const accessor = sortAccessors[sortKey] || ((item) => item[sortKey]);
    const sorted = [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va ?? "").localeCompare(String(vb ?? ""), "fi", { sensitivity: "base" });
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [items, search, sortKey, sortDir, searchFields, sortAccessors]);

  return { search, setSearch, sortKey, sortDir, toggleSort, items: result };
}
