// src/components/Manager.tsx

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, ApiError } from "../api/apiClient";

interface Tag extends NewTag {
  id: number;
}

const ACTIVITY_ENDPOINT = "/activity/";
const TAG_ENDPOINT = "/tag/";
const ACTIVITY_TAGS_ENDPOINT = (activityId: number) => `/activity/${activityId}/tags/`;

interface NewActivity {
  name: string;
  description: string;
  description_spanish: string;
}

interface NewTag {
  name: string;
  color: string;
}

const EMPTY_ACTIVITY: NewActivity = {
  name: "",
  description: "",
  description_spanish: "",
};

const EMPTY_TAG: NewTag = {
  name: "",
  color: "#5b8def",
};

interface ManagerProps {
  onDataChanged?: () => void;
}

export default function Manager({ onDataChanged }: ManagerProps) {
  const [activityForm, setActivityForm] = useState<NewActivity>(EMPTY_ACTIVITY);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySuccess, setActivitySuccess] = useState(false);

  const [tagForm, setTagForm] = useState<NewTag>(EMPTY_TAG);
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState(false);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

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

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityForm.name.trim()) {
      setActivityError("Name is required");
      return;
    }

    setSavingActivity(true);
    setActivityError(null);
    setActivitySuccess(false);
    try {
      const created = await apiPost<{ id: number }>(ACTIVITY_ENDPOINT, activityForm);
      if (selectedTagIds.length > 0) {
        await apiPatch(ACTIVITY_TAGS_ENDPOINT(created.id), { tags: selectedTagIds });
      }
      setActivityForm(EMPTY_ACTIVITY);
      setSelectedTagIds([]);
      setActivitySuccess(true);
      onDataChanged?.();
    } catch (err) {
      setActivityError(
        err instanceof ApiError ? `Save failed (${err.status})` : "Failed to create activity"
      );
    } finally {
      setSavingActivity(false);
    }
  }

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

  function handleTabIndent(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    const newValue = value.slice(0, selectionStart) + "\t" + value.slice(selectionEnd);
    target.value = newValue;
    target.selectionStart = target.selectionEnd = selectionStart + 1;

    // Sync React state
    const event = new Event("input", { bubbles: true });
    target.dispatchEvent(event);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Add Activities & Tags</h2>

      <div style={styles.panelRow}>
        <form style={styles.panel} onSubmit={submitActivity}>
          <h3 style={styles.panelHeading}>New Activity</h3>

          <label style={styles.fieldLabel}>
            Name
            <input
              style={styles.textInput}
              value={activityForm.name}
              onChange={(e) =>
                setActivityForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </label>

          <label style={styles.fieldLabel}>
            Description
            <textarea
              style={styles.textArea}
              value={activityForm.description}
              onChange={(e) =>
                setActivityForm((f) => ({ ...f, description: e.target.value }))
              }
              onKeyDown={handleTabIndent}
            />
          </label>

          <label style={styles.fieldLabel}>
            Description (Spanish)
            <textarea
              style={styles.textArea}
              value={activityForm.description_spanish}
              onChange={(e) =>
                setActivityForm((f) => ({ ...f, description_spanish: e.target.value }))
              }
              onKeyDown={handleTabIndent}
            />
          </label>
          <label style={styles.fieldLabel}>
            Tags
            <div style={styles.tagOptionRow}>
              {availableTags.length === 0 && (
                <span style={styles.emptyTagsText}>No tags yet — create one on the right.</span>
              )}
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setSelectedTagIds((ids) =>
                        isSelected ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]
                      )
                    }
                    style={tagOptionStyle(tag.color, isSelected)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </label>

          {activityError && <p style={styles.errorText}>{activityError}</p>}
          {activitySuccess && <p style={styles.successText}>Activity created.</p>}

          <button style={styles.saveButton} type="submit" disabled={savingActivity}>
            {savingActivity ? "Saving…" : "Create Activity"}
          </button>
        </form>

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
      </div>
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

function tagOptionStyle(color: string, selected: boolean): React.CSSProperties {
  const safeColor = /^#([0-9a-fA-F]{6})$/.test(color) ? color : "#9a9aa2";
  return {
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${safeColor}`,
    backgroundColor: selected ? safeColor : "transparent",
    color: selected ? "#1c1d21" : safeColor,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
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
};