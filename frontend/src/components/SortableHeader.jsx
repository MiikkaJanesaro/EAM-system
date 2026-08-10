export function SortableHeader({ label, sortKey, currentKey, dir, onSort }) {
  const active = sortKey === currentKey;
  return (
    <th
      className="sortable-header"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <span className="sort-arrow">{active ? (dir === "asc" ? " ▲" : " ▼") : ""}</span>
    </th>
  );
}
