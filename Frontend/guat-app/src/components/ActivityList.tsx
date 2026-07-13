// src/components/ActivityList.tsx
//
// Fetches every Activity from the backend and renders one row per activity.
//
// I don't know your Activity model's actual fields, so this assumes a
// common shape (id, name, date, description). Update the `Activity`
// interface and the <td> cells below to match your real Django model/
// serializer fields, and update `ACTIVITY_ENDPOINT` if your route isn't /activities.

import { useEffect, useState } from "react";
import { apiGet, apiPatch, ApiError } from "../api/apiClient";
import HeaderTagList from "./HeaderTagList";

const ACTIVITY_ENDPOINT = "/activity/";

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
}

interface Activity {
  id: number;
  name: string;
  description: string;
  description_spanish: string;
  tags: Tag[];
  achived: boolean;
  starred: boolean;
}

type EditableFields = Pick<Activity, "name" | "description" | "description_spanish">;

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditableFields>({
    name: "",
    description: "",
    description_spanish: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (editingId === id) setEditingId(null); // collapsing cancels an open edit
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function startEdit(activity: Activity) {
    setEditingId(activity.id);
    setSaveError(null);
    setEditForm({
      name: activity.name,
      description: activity.description,
      description_spanish: activity.description_spanish,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await apiPatch<Activity>(`${ACTIVITY_ENDPOINT}${id}/`, editForm);
      setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      setEditingId(null);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? `Save failed (${err.status})` : "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadActivities() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<Activity[]>(ACTIVITY_ENDPOINT);
        if (!cancelled) setActivities(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? `Request failed (${err.status})`
              : "Failed to load activities"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadActivities();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p style={styles.message}>Loading activities…</p>;
  if (error) return <p style={{ ...styles.message, color: "#c0392b" }}>{error}</p>;

  return (
  <div style={styles.container}>
    <h2 style={styles.heading}>Activities</h2>

    {activities.length === 0 ? (
      <p style={styles.message}>No activities found.</p>
    ) : (
      <div style={styles.list}>
        {activities.map((activity) => {
          const isExpanded = expandedIds.has(activity.id);
          const isEditing = editingId === activity.id;

          return (
            <div
              key={activity.id}
              style={{ ...styles.card, backgroundColor: DEFAULT_CARD_BG }}
            >
              <div style={styles.cardHeader} onClick={() => toggleExpanded(activity.id)}>
                <span style={styles.cardName}>{activity.name}</span>

                <HeaderTagList tags={activity.tags} />

                <span
                  style={{
                    display: "inline-block",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    justifySelf: "end",
                  }}
                >
                  ▶
                </span>
              </div>

              {isExpanded && (
                <div style={styles.cardDetail}>
                  {isEditing ? (
                    <div style={styles.editForm} onClick={(e) => e.stopPropagation()}>
                      <label style={styles.fieldLabel}>
                        Name
                        <input
                          style={styles.textInput}
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </label>

                      <label style={styles.fieldLabel}>
                        Description
                        <textarea
                          style={styles.textArea}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, description: e.target.value }))
                          }
                        />
                      </label>

                      <label style={styles.fieldLabel}>
                        Description (Spanish)
                        <textarea
                          style={styles.textArea}
                          value={editForm.description_spanish}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              description_spanish: e.target.value,
                            }))
                          }
                        />
                      </label>

                      {saveError && (
                        <p style={{ ...styles.message, color: "#e57373" }}>{saveError}</p>
                      )}

                      <div style={styles.editActions}>
                        <button
                          style={styles.saveButton}
                          onClick={() => saveEdit(activity.id)}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          style={styles.cancelButton}
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={styles.detailNameTags}>
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Name</span>
                          <span>{activity.name}</span>
                        </div>

                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Tags</span>
                          <div style={styles.tagList}>
                            {activity.tags.length === 0 ? (
                              <span style={styles.detailMuted}>No tags</span>
                            ) : (
                              activity.tags.map((tag) => (
                                <span key={tag.id} style={tagStyle(tag.color)}>
                                  {tag.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Description</span>
                        <p style={styles.detailText}>
                          {activity.description || (
                            <span style={styles.detailMuted}>—</span>
                          )}
                        </p>
                      </div>

                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Description (Spanish)</span>
                        <p style={styles.detailText}>
                          {activity.description_spanish || (
                            <span style={styles.detailMuted}>—</span>
                          )}
                        </p>
                      </div>

                      <button
                        style={styles.editButton}
                        onClick={() => startEdit(activity)}
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);
}

const DEFAULT_CARD_BG = "#2d2e33";

function tagStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    border: `1px solid ${color}`,
    borderRadius: 6,
    color,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "18px",
  };
}

const tagListBase: React.CSSProperties = {
  display: "flex",
  gap: 6,
  justifySelf: "end",
  justifyContent: "center",
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    color: "#ffffff",
  },
  heading: {
    marginBottom: 12,
  },
  message: {
    color: "#111",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  card: {
    border: "1px solid #e2e2e2",
    borderRadius: 12,
    overflow: "hidden", // clips inner content to the rounded corners
    transition: "background-color 0.15s ease",
  },
  cardHeader: {
    display: "grid",
    gridTemplateColumns: "1fr minmax(0, 40%) 24px",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    cursor: "pointer",
  },
  cardName: {
    fontWeight: 500,
    justifySelf: "start",
    textAlign: "left",
    marginLeft: "4px",
    minWidth: 0, // let the track shrink instead of forcing overflow
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tagList: {
    ...tagListBase,
    flexWrap: "wrap" as const,
  },
  headerTagList: {
    ...tagListBase,
    flexWrap: "nowrap" as const,
    overflow: "hidden",
    minWidth: 0,
  },
  cardDetail: {
    borderTop: "1px solid #e2e2e2",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  detailRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "#9a9aa2",
    fontWeight: 600,
  },
  detailText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap" as const,
  },
  detailMuted: {
    color: "#9a9aa2",
    fontStyle: "italic" as const,
  },
  detailNameTags: {
  display: "flex",
  gap: 24,
  alignItems: "flex-start",
  },
  editButton: {
    alignSelf: "flex-start",
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #5b8def",
    backgroundColor: "transparent",
    color: "#5b8def",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  editForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
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
  },
  editActions: {
    display: "flex",
    gap: 8,
  },
  saveButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#5b8def",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  cancelButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #45454d",
    backgroundColor: "transparent",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
