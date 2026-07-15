// src/components/ActivityList.tsx

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { apiGet, apiPatch, ApiError } from "../api/apiClient";
import HeaderTagList from "./HeaderTagList";

const ACTIVITY_ENDPOINT = "/activity/";
const TAG_ENDPOINT = "/tag/";

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

type EditableFields = Pick<Activity, "name" | "description" | "description_spanish"> & {
  tags: Tag[];
};

interface ActivityListProps {
  refreshKey?: number;
}

export default function ActivityList({ refreshKey }: ActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditableFields>({
    name: "",
    description: "",
    description_spanish: "",
    tags: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  const [includeTagIds, setIncludeTagIds] = useState<number[]>([]);
  const [excludeTagIds, setExcludeTagIds] = useState<number[]>([]);

  const [openDropdown, setOpenDropdown] = useState<"sort" | "include" | "exclude" | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const includeDropdownRef = useRef<HTMLDivElement>(null);
  const excludeDropdownRef = useRef<HTMLDivElement>(null);

  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function selectSort(direction: "asc" | "desc" | null) {
    setSortDirection(direction);
    setOpenDropdown(null);
  }

  const sortLabel =
    sortDirection === "asc" ? "Name A → Z" : sortDirection === "desc" ? "Name Z → A" : "Sort: Default";

  function toggleIncludeTag(tagId: number) {
    setIncludeTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function toggleExcludeTag(tagId: number) {
    setExcludeTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        openDropdown === "sort" &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === "include" &&
        includeDropdownRef.current &&
        !includeDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === "exclude" &&
        excludeDropdownRef.current &&
        !excludeDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

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
            err instanceof ApiError ? `Request failed (${err.status})` : "Failed to load activities"
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
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    apiGet<Tag[]>(TAG_ENDPOINT)
      .then((data) => {
        if (!cancelled) setAllTags(data);
      })
      .catch(() => {
        // Non-fatal: tag picker just stays empty if this fails.
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useLayoutEffect(() => {
    if (!openDropdown) return;

    const wrapperRef =
      openDropdown === "sort"
        ? sortDropdownRef
        : openDropdown === "include"
        ? includeDropdownRef
        : excludeDropdownRef;

    function reposition() {
      const wrapperEl = wrapperRef.current;
      const panelEl = panelRef.current;
      if (!wrapperEl || !panelEl) return;

      const wrapperRect = wrapperEl.getBoundingClientRect();
      const panelWidth = panelEl.offsetWidth;
      const margin = 8;

      let left = wrapperRect.left;
      if (left + panelWidth > window.innerWidth - margin) {
        left = window.innerWidth - margin - panelWidth;
      }
      if (left < margin) {
        left = margin;
      }

      setPanelPos({ top: wrapperRect.bottom + 4, left });
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [openDropdown]);

  const filteredActivities = activities
    .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(
      (a) =>
        includeTagIds.length === 0 ||
        includeTagIds.every((id) => a.tags.some((t) => t.id === id))
    )
    .filter(
      (a) =>
        excludeTagIds.length === 0 ||
        !excludeTagIds.some((id) => a.tags.some((t) => t.id === id))
    )
    .sort((a, b) => {
      if (!sortDirection) return 0;
      return sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });

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
      tags: activity.tags,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  function toggleEditTag(tag: Tag) {
    setEditForm((f) => {
      const has = f.tags.some((t) => t.id === tag.id);
      return {
        ...f,
        tags: has ? f.tags.filter((t) => t.id !== tag.id) : [...f.tags, tag],
      };
    });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setSaveError(null);
    try {
      const { tags, ...fields } = editForm;
      const [updated] = await Promise.all([
        apiPatch<Activity>(`${ACTIVITY_ENDPOINT}${id}/`, fields),
        apiPatch(`${ACTIVITY_ENDPOINT}${id}/tags/`, { tags: tags.map((t) => t.id) }),
      ]);
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated, tags } : a))
      );
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

  useEffect(() => {
    let cancelled = false;

    apiGet<Tag[]>(TAG_ENDPOINT)
      .then((data) => {
        if (!cancelled) setAllTags(data);
      })
      .catch(() => {
        // Non-fatal: tag picker just stays empty if this fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      <div style={styles.searchWrapper}>
        <svg
          style={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.controlsRow}>
        <div ref={sortDropdownRef} style={styles.tagDropdownWrapper}>
          <button
            type="button"
            style={styles.tagDropdownButton}
            onClick={() => setOpenDropdown((d) => (d === "sort" ? null : "sort"))}
          >
            {sortLabel}
            <span style={styles.dropdownCaret}>▾</span>
          </button>
          {openDropdown === "sort" && (
            <div
              ref={panelRef}
              style={{
                ...styles.tagDropdownPanel,
                position: "fixed",
                top: panelPos?.top ?? -9999,
                left: panelPos?.left ?? -9999,
                visibility: panelPos ? "visible" : "hidden",
              }}
            >
              <div style={styles.tagDropdownOption} onClick={() => selectSort(null)}>
                Default
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("asc")}>
                Name A → Z
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("desc")}>
                Name Z → A
              </div>
            </div>
          )}
        </div>

        <div ref={includeDropdownRef} style={styles.tagDropdownWrapper}>
          <button
            type="button"
            style={styles.tagDropdownButton}
            onClick={() => setOpenDropdown((d) => (d === "include" ? null : "include"))}
          >
            {includeTagIds.length === 0 ? "Include tags" : `${includeTagIds.length} included`}
            <span style={styles.dropdownCaret}>▾</span>
          </button>
          {openDropdown === "include" && (
            <div
              ref={panelRef}
              style={{
                ...styles.tagDropdownPanel,
                position: "fixed",
                top: panelPos?.top ?? -9999,
                left: panelPos?.left ?? -9999,
                visibility: panelPos ? "visible" : "hidden",
              }}
            >
              {allTags.map((tag) => (
                <label key={tag.id} style={styles.tagDropdownOption}>
                  <input
                    type="checkbox"
                    checked={includeTagIds.includes(tag.id)}
                    onChange={() => toggleIncludeTag(tag.id)}
                  />
                  <span style={tagStyle(tag.color)}>{tag.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div ref={excludeDropdownRef} style={styles.tagDropdownWrapper}>
          <button
            type="button"
            style={styles.tagDropdownButton}
            onClick={() => setOpenDropdown((d) => (d === "exclude" ? null : "exclude"))}
          >
            {excludeTagIds.length === 0 ? "Exclude tags" : `${excludeTagIds.length} excluded`}
            <span style={styles.dropdownCaret}>▾</span>
          </button>
          {openDropdown === "exclude" && (
            <div
              ref={panelRef}
              style={{
                ...styles.tagDropdownPanel,
                position: "fixed",
                top: panelPos?.top ?? -9999,
                left: panelPos?.left ?? -9999,
                visibility: panelPos ? "visible" : "hidden",
              }}
            >
              {allTags.map((tag) => (
                <label key={tag.id} style={styles.tagDropdownOption}>
                  <input
                    type="checkbox"
                    checked={excludeTagIds.includes(tag.id)}
                    onChange={() => toggleExcludeTag(tag.id)}
                  />
                  <span style={tagStyle(tag.color)}>{tag.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p style={styles.message}>Loading activities…</p>
      ) : error ? (
        <p style={{ ...styles.message, color: "#c0392b" }}>{error}</p>
      ) : activities.length === 0 ? (
        <p style={styles.message}>No activities found.</p>
      ) : (
        <div style={styles.list}>
          {filteredActivities.map((activity) => {
            const isExpanded = expandedIds.has(activity.id);
            const isEditing = editingId === activity.id;

            return (
              <div
                key={activity.id}
                style={{ ...styles.card, backgroundColor: DEFAULT_CARD_BG }}
              >
                <div
                  style={{
                    ...styles.cardHeader,
                    alignItems: isExpanded ? "flex-start" : "center",
                  }}
                  onClick={() => toggleExpanded(activity.id)}
                >
                  <span style={styles.cardName}>{activity.name}</span>
                  {!isExpanded && <HeaderTagList tags={activity.tags} />}
                  <span
                    style={{
                      display: "inline-block",
                      gridColumn: "3",
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
                            onKeyDown={handleTabIndent}
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
                            onKeyDown={handleTabIndent}
                          />
                        </label>

                        <label style={styles.fieldLabel}>
                          Tags
                          <div style={styles.tagPicker}>
                            {allTags.map((tag) => {
                              const selected = editForm.tags.some((t) => t.id === tag.id);
                              return (
                                <span
                                  key={tag.id}
                                  onClick={() => toggleEditTag(tag)}
                                  style={
                                    selected
                                      ? tagOptionSelectedStyle(tag.color)
                                      : tagOptionStyle(tag.color)
                                  }
                                >
                                  {tag.name}
                                </span>
                              );
                            })}
                          </div>
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

function tagOptionStyle(color: string): React.CSSProperties {
  return {
    ...tagStyle(color),
    cursor: "pointer",
    opacity: 0.55,
    textTransform: "none",
    letterSpacing: "normal",
  };
}

function tagOptionSelectedStyle(color: string): React.CSSProperties {
  return {
    ...tagStyle(color),
    cursor: "pointer",
    backgroundColor: color,
    color: "#1c1d21",
    fontWeight: 600,
    textTransform: "none",
    letterSpacing: "normal",
  };
}

const tagListBase: React.CSSProperties = {
  display: "flex",
  gap: 6,
  //justifySelf: "end",
  justifyContent: "flex-end",
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
    justifyContent: "center"
  },
  expandedTagList: {
    display: "grid",
    gridTemplateColumns: "1fr minmax(0, 40%) 24px",
    gap: 12,
    overflow: "hidden",
    transition: "max-height 0.2s ease, opacity 0.15s ease",
    padding: "0 16px",
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
    justifyContent: "center",
    gap: "24px",
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
  tagPicker: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
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
  searchWrapper: {
    position: "relative" as const,
    marginBottom: 12,
  },
  searchIcon: {
    position: "absolute" as const,
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 16,
    height: 16,
    color: "#9a9aa2",
    pointerEvents: "none" as const,
  },
  searchInput: {
    fontFamily: "inherit",
    fontSize: 14,
    color: "#ffffff",
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "8px 10px 8px 34px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  controlsRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
    marginBottom: 12,
    flexWrap: "wrap" as const,
  },
  tagDropdownWrapper: {
  position: "relative" as const,
  },
  tagDropdownButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid #45454d",
    backgroundColor: "#1c1d21",
    color: "#c9c9d1",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    minWidth: "clamp(72px, 26vw, 120px)",
    maxWidth: "100%",
  },
  dropdownCaret: {
    fontSize: 10,
    color: "#9a9aa2",
  },
  tagDropdownPanel: {
    zIndex: 10,
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "6px 0",
    minWidth: "clamp(120px, 45vw, 160px)",
    maxWidth: "min(240px, 90vw)",
    maxHeight: 220,
    overflowY: "auto" as const,
    display: "flex",
    flexDirection: "column" as const,
  },
  tagDropdownOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    textTransform: "none" as const,
    letterSpacing: "normal",
    fontWeight: 400,
  },
};
