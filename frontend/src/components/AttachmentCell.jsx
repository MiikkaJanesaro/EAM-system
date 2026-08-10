import { useState } from "react";
import { api } from "../api/client.js";

export function AttachmentCell({ workorder, onAttachmentsChanged }) {
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const { key, uploadUrl } = await api.attachmentUploadUrl(workorder.id, file.name, file.type);
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Kuvan lataus S3:aan epäonnistui.");
      await api.confirmAttachment(workorder.id, key, file.name);
      onAttachmentsChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment) {
    if (!confirm(`Poistetaanko liite "${attachment.filename}"?`)) return;
    setDeletingKey(attachment.key);
    try {
      await api.deleteAttachment(workorder.id, attachment.key);
      onAttachmentsChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {(workorder.attachments || []).map((a) => (
        <span key={a.key} className="attachment-thumb">
          <a href={a.url} target="_blank" rel="noreferrer" title={a.filename}>
            {a.url && a.filename?.match(/\.(jpe?g|png|gif|webp)$/i) ? (
              <img
                src={a.url}
                alt={a.filename}
                style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
              />
            ) : (
              "📎"
            )}
          </a>
          <button
            type="button"
            className="attachment-remove"
            title={`Poista liite ${a.filename}`}
            aria-label={`Poista liite ${a.filename}`}
            onClick={() => handleDelete(a)}
            disabled={deletingKey === a.key}
          >
            ×
          </button>
        </span>
      ))}
      <label className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.8rem", cursor: "pointer" }}>
        {uploading ? "Ladataan…" : "+ Kuva"}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
