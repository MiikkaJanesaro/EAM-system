const LABELS = {
  ok: "Kunnossa",
  maintenance_due: "Huolto lähestyy",
  overdue: "Myöhässä",
};

export function StatusPill({ status, label }) {
  return <span className={`pill pill-${status}`}>{label || LABELS[status] || status}</span>;
}
