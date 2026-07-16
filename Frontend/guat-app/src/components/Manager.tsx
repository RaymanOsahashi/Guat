// src/components/Manager.tsx

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "../api/apiClient";

interface Tag extends NewTag {
  id: number;
}

const TAG_ENDPOINT = "/tag/";
const TAG_EDIT_ENDPOINT = (tagId: number) => `/tag/${tagId}/`;

interface NewTag {
  name: string;
  color: string;
}

const EMPTY_TAG: NewTag = {
  name: "",
  color: "#ffffff",
};

interface ManagerProps {
  onDataChanged?: () => void;
}

export default function Manager({ onDataChanged }: ManagerProps) {
  const [tagForm, setTagForm] = useState<NewTag>(EMPTY_TAG);
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState(false);

  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagForm, setEditTagForm] = useState<NewTag>(EMPTY_TAG);
  const [savingEditTag, setSavingEditTag] = useState(false);
  const [editTagError, setEditTagError] = useState<string | null>(null);
  const [editTagSuccess, setEditTagSuccess] = useState(false);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [confirmingDeleteTagId, setConfirmingDeleteTagId] = useState<number | null>(null);
  const [deletingTag, setDeletingTag] = useState(false);
  const [deleteTagError, setDeleteTagError] = useState<string | null>(null);

  async function refreshTags() {
    try {
      setAvailableTags(await apiGet<Tag[]>(TAG_ENDPOINT));
    } catch {
      // picker just stays empty
    }
  }

  useEffect(() => {
    refreshTags();
  }, []);

  async function submitTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagForm.name.trim()) {
      setTagError("Name is required");
      return;
    }
    if (!/^#([0-9a-fA-F]{6})$/.test(tagForm.color)) {
      setTagError("Color must be a hex code, e.g. #5b8def");
      return;
    }

    setSavingTag(true);
    setTagError(null);
    setTagSuccess(false);
    try {
        await apiPost(TAG_ENDPOINT, tagForm);
        setTagForm(EMPTY_TAG);
        setTagSuccess(true);
        refreshTags();
        onDataChanged?.();
    } catch (err) {
      setTagError(
        err instanceof ApiError ? `Save failed (${err.status})` : "Failed to create tag"
      );
    } finally {
      setSavingTag(false);
    }
  }

  function selectTagToEdit(tag: Tag) {
    setEditingTagId(tag.id);
    setEditTagForm({ name: tag.name, color: tag.color });
    setEditTagError(null);
    setEditTagSuccess(false);
  }

  async function submitEditTag(e: React.FormEvent) {
    e.preventDefault();
    if (editingTagId === null) return;
    if (!editTagForm.name.trim()) {
      setEditTagError("Name is required");
      return;
    }
    if (!/^#([0-9a-fA-F]{6})$/.test(editTagForm.color)) {
      setEditTagError("Color must be a hex code, e.g. #5b8def");
      return;
    }

    setSavingEditTag(true);
    setEditTagError(null);
    setEditTagSuccess(false);
    try {
      await apiPatch(TAG_EDIT_ENDPOINT(editingTagId), editTagForm);
      setEditTagSuccess(true);
      refreshTags();
      onDataChanged?.();
    } catch (err) {
      setEditTagError(
        err instanceof ApiError ? `Save failed (${err.status})` : "Failed to update tag"
      );
    } finally {
      setSavingEditTag(false);
    }
  }

  function askDeleteTag(id: number) {
    setConfirmingDeleteTagId(id);
    setDeleteTagError(null);
  }

  function cancelDeleteTag() {
    setConfirmingDeleteTagId(null);
    setDeleteTagError(null);
  }

  async function confirmDeleteTag(id: number) {
    setDeletingTag(true);
    setDeleteTagError(null);
    try {
      await apiDelete(TAG_EDIT_ENDPOINT(id));
      setAvailableTags((prev) => prev.filter((t) => t.id !== id));
      if (editingTagId === id) {
        setEditingTagId(null);
        setEditTagForm(EMPTY_TAG);
      }
      setConfirmingDeleteTagId(null);
      onDataChanged?.();
    } catch (err) {
      setDeleteTagError(
        err instanceof ApiError ? `Delete failed (${err.status})` : "Failed to delete tag"
      );
    } finally {
      setDeletingTag(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Manage Tags</h2>

      <div style={styles.panelRow}>
        <form style={styles.panel} onSubmit={submitTag}>
          <h3 style={styles.panelHeading}>New Tag</h3>

          <label style={styles.fieldLabel}>
            Name
            <input
              style={styles.textInput}
              value={tagForm.name}
              onChange={(e) => setTagForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label style={styles.fieldLabel}>
            Color
            <div style={styles.colorRow}>
              <input
                type="color"
                style={styles.colorPicker}
                value={/^#([0-9a-fA-F]{6})$/.test(tagForm.color) ? tagForm.color : "#5b8def"}
                onChange={(e) => setTagForm((f) => ({ ...f, color: e.target.value }))}
              />
              <input
                style={styles.textInput}
                value={tagForm.color}
                onChange={(e) => setTagForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="#5b8def"
              />
            </div>
          </label>

          {tagForm.name && (
            <span style={tagPreviewStyle(tagForm.color)}>{tagForm.name}</span>
          )}

          {tagError && <p style={styles.errorText}>{tagError}</p>}
          {tagSuccess && <p style={styles.successText}>Tag created.</p>}

          <button style={styles.saveButton} type="submit" disabled={savingTag}>
            {savingTag ? "Saving…" : "Create Tag"}
          </button>
        </form>

        <form style={styles.panel} onSubmit={submitEditTag}>
          <h3 style={styles.panelHeading}>Edit Tag</h3>

          <label style={styles.fieldLabel}>
            Select Tag
            <select
              style={styles.textInput}
              value={editingTagId ?? ""}
              onChange={(e) => {
                const tag = availableTags.find((t) => t.id === Number(e.target.value));
                if (tag) selectTagToEdit(tag);
              }}
            >
              <option value="" disabled>
                Choose a tag…
              </option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </label>

          {editingTagId !== null && (
            <>
              <label style={styles.fieldLabel}>
                Name
                <input
                  style={styles.textInput}
                  value={editTagForm.name}
                  onChange={(e) => setEditTagForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label style={styles.fieldLabel}>
                Color
                <div style={styles.colorRow}>
                  <input
                    type="color"
                    style={styles.colorPicker}
                    value={/^#([0-9a-fA-F]{6})$/.test(editTagForm.color) ? editTagForm.color : "#5b8def"}
                    onChange={(e) => setEditTagForm((f) => ({ ...f, color: e.target.value }))}
                  />
                  <input
                    style={styles.textInput}
                    value={editTagForm.color}
                    onChange={(e) => setEditTagForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="#5b8def"
                  />
                </div>
              </label>

              <span style={tagPreviewStyle(editTagForm.color)}>
                {editTagForm.name || "Preview"}
              </span>

              {editTagError && <p style={styles.errorText}>{editTagError}</p>}
              {editTagSuccess && <p style={styles.successText}>Tag updated.</p>}

              <div style={styles.editTagActionsRow}>
                <button style={styles.saveButton} type="submit" disabled={savingEditTag}>
                  {savingEditTag ? "Saving…" : "Update Tag"}
                </button>
                <button
                  type="button"
                  style={styles.deleteButton}
                  className="delete-button"
                  onClick={() => askDeleteTag(editingTagId)}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {confirmingDeleteTagId !== null && (
        <div style={styles.modalOverlay} onClick={cancelDeleteTag}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Delete tag?</p>
            <p style={styles.modalText}>
              {availableTags.find((t) => t.id === confirmingDeleteTagId)?.name}
            </p>
            <p style={styles.modalSubtext}>This can't be undone.</p>

            {deleteTagError && (
              <p style={{ ...styles.message, color: "#e57373", fontSize: 13 }}>{deleteTagError}</p>
            )}

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={cancelDeleteTag} disabled={deletingTag}>
                Cancel
              </button>
              <button
                style={styles.deleteConfirmButton}
                onClick={() => confirmDeleteTag(confirmingDeleteTagId)}
                disabled={deletingTag}
              >
                {deletingTag ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function tagPreviewStyle(color: string): React.CSSProperties {
  const safeColor = /^#([0-9a-fA-F]{6})$/.test(color) ? color : "#9a9aa2";
  return {
    display: "inline-block",
    alignSelf: "flex-start",
    padding: "2px 8px",
    border: `1px solid ${safeColor}`,
    borderRadius: 6,
    color: safeColor,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "18px",
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    color: "#ffffff",
  },
  heading: {
    marginBottom: 12,
  },
  panelRow: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  panel: {
    flex: "1 1 280px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    border: "1px solid #45454d",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#2d2e33",
  },
  panelHeading: {
    margin: 0,
    fontSize: 15,
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "#9a9aa2",
    fontWeight: 600,
  },
  textInput: {
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: "normal",
    color: "#ffffff",
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "8px 10px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  textArea: {
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: "normal",
    color: "#ffffff",
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "8px 10px",
    minHeight: 72,
    resize: "vertical" as const,
    width: "100%",
    boxSizing: "border-box" as const,
  },
  colorRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  colorPicker: {
    width: 40,
    height: 36,
    padding: 0,
    border: "1px solid #45454d",
    borderRadius: 6,
    backgroundColor: "#1c1d21",
    cursor: "pointer",
    flexShrink: 0,
  },
  saveButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#5b8def",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  errorText: {
    fontSize: 13,
    color: "#e57373",
    margin: 0,
  },
  successText: {
    fontSize: 13,
    color: "#81c784",
    margin: 0,
  },
  tagOptionRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
  },
  emptyTagsText: {
    fontSize: 12,
    color: "#9a9aa2",
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: "normal",
  },
  editTagActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  deleteButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid #e57373",
    backgroundColor: "transparent",
    color: "#e57373",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 12,
    padding: 20,
    width: 320,
    boxSizing: "border-box" as const,
  },
  modalTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#ffffff",
  },
  modalText: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#c9c9cf",
  },
  modalSubtext: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#9a9aa2",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid #45454d",
    backgroundColor: "transparent",
    color: "#c9c9cf",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteConfirmButton: {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#e57373",
    color: "#1c1d21",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  message: {
    margin: 0,
  },
};