// src/components/ActivityList.tsx

import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { apiPost, apiGet, apiPatch, apiDelete, ApiError } from "../api/apiClient";
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
  created_date: string;
  updated_date: string
  is_achived: boolean;
  starred: boolean;
}

type EditableFields = Pick<Activity, "name" | "description" | "description_spanish" | "starred"> & {
  tags: Tag[];
};

interface ActivityListProps {
  refreshKey?: number;
}

type SortMode = "name_asc" | "name_desc" | "created_desc" | "created_asc" | "updated_desc";

export default function ActivityList({ refreshKey }: ActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<EditableFields>({
    name: "",
    description: "",
    description_spanish: "",
    tags: [],
    starred: false,
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditableFields>({
    name: "",
    description: "",
    description_spanish: "",
    tags: [],
    starred: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshPressed, setRefreshPressed] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>("created_desc");

  const [includeTagIds, setIncludeTagIds] = useState<number[]>([]);
  const [excludeTagIds, setExcludeTagIds] = useState<number[]>([]);

  const [openDropdown, setOpenDropdown] = useState<"sort" | "include" | "exclude" | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const includeDropdownRef = useRef<HTMLDivElement>(null);
  const excludeDropdownRef = useRef<HTMLDivElement>(null);

  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function loadActivities() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Activity[]>(ACTIVITY_ENDPOINT);
      setActivities(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? `Request failed (${err.status})` : "Failed to load activities"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTags(signal?: { cancelled: boolean }) {
    try {
      const data = await apiGet<Tag[]>(TAG_ENDPOINT);
      if (!signal?.cancelled) setAllTags(data);
      return data;
    } catch {
      // Non-fatal: tag picker just stays empty if this fails.
      return null;
    }
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadActivities();
    loadTags(signal).then((tags) => {
      if (signal.cancelled || !tags) return;
      const validTagIds = new Set(tags.map((t) => t.id));
      setIncludeTagIds((prev) => prev.filter((id) => validTagIds.has(id)));
      setExcludeTagIds((prev) => prev.filter((id) => validTagIds.has(id)));
    });
    return () => {
      signal.cancelled = true;
    };
  }, [refreshKey]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadTags()]);
    setTimeout(() => setRefreshing(false), 300); // brief lit-up feedback
  }

  function selectSort(mode: SortMode) {
    setSortMode(mode);
    setOpenDropdown(null);
  }

  const sortLabels: Record<SortMode, string> = {
    name_asc: "Name A → Z",
    name_desc: "Name Z → A",
    created_desc: "Newest",
    created_asc: "Oldest",
    updated_desc: "Last updated",
  };

const sortLabel = sortLabels[sortMode];

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
      if (a.starred !== b.starred) {
        return a.starred ? -1 : 1;
      }
      switch (sortMode) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "created_asc":
          return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
        case "created_desc":
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        case "updated_desc":
          return new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime();
        default:
          return 0;
      }
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

  function startCreate() {
    setCreating(true);
    setCreateError(null);
    setCreateForm({ name: "", description: "", description_spanish: "", tags: [], starred: false });
  }

  function cancelCreate() {
    setCreating(false);
    setCreateError(null);
  }

  function toggleCreateTag(tag: Tag) {
    setCreateForm((f) => {
      const has = f.tags.some((t) => t.id === tag.id);
      return {
        ...f,
        tags: has ? f.tags.filter((t) => t.id !== tag.id) : [...f.tags, tag],
      };
    });
  }

  async function saveCreate() {
    setCreateSaving(true);
    setCreateError(null);
    try {
      const { tags, ...fields } = createForm;
      const created = await apiPost<Activity>(ACTIVITY_ENDPOINT, fields);
      if (tags.length > 0) {
        await apiPatch(`${ACTIVITY_ENDPOINT}${created.id}/tags/`, { tags: tags.map((t) => t.id) });
      }
      setActivities((prev) => [...prev, { ...created, tags }]);
      setCreating(false);
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? `Create failed (${err.status})` : "Failed to create activity"
      );
    } finally {
      setCreateSaving(false);
    }
  }

  function startEdit(activity: Activity) {
  setEditingId(activity.id);
  setSaveError(null);
  setEditForm({
    name: activity.name,
    description: activity.description,
    description_spanish: activity.description_spanish,
    starred: activity.starred,
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
        prev.map((a) => (a.id === id ? { ...a, ...updated, ...fields, tags } : a))
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

  function askDelete(id: number) {
    setConfirmingDeleteId(id);
    setDeleteError(null);
  }

  function cancelDelete() {
    setConfirmingDeleteId(null);
    setDeleteError(null);
  }

  async function confirmDelete(id: number) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`${ACTIVITY_ENDPOINT}${id}/`);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (editingId === id) setEditingId(null);
      setConfirmingDeleteId(null);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? `Delete failed (${err.status})` : "Failed to delete activity"
      );
    } finally {
      setDeleting(false);
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
      <div style={styles.searchRow}>
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

        <button
          style={{
            ...styles.refreshButton,
            backgroundColor: refreshPressed ? "#33343a" : "#1c1d21",
            borderColor: refreshPressed ? "#5b8def" : "#45454d",
          }}
          onMouseDown={() => setRefreshPressed(true)}
          onMouseUp={() => setRefreshPressed(false)}
          onMouseLeave={() => setRefreshPressed(false)}
          onTouchStart={() => setRefreshPressed(true)}
          onTouchEnd={() => setRefreshPressed(false)}
          onClick={() => handleRefresh()}
          disabled={refreshing}
          aria-label="Refresh songs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: 16,
              height: 16,
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
            }}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
        <button style={styles.addActivityButton} onClick={startCreate} aria-label="Add activity">
          + Add Activity
        </button>
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
              <div style={styles.tagDropdownOption} onClick={() => selectSort("updated_desc")}>
                Last Updated
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("name_asc")}>
                Name A → Z
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("name_desc")}>
                Name Z → A
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("created_desc")}>
                Newest
              </div>
              <div style={styles.tagDropdownOption} onClick={() => selectSort("created_asc")}>
                Oldest
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
      {creating && (
        <div style={{ ...styles.card, backgroundColor: DEFAULT_CARD_BG, marginBottom: 12 }}>
          <div style={{ ...styles.cardDetail, borderTop: "none" }}>
            <div style={styles.editForm}>
              <label style={styles.fieldLabel}>
                Name
                <input
                  style={styles.textInput}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label style={styles.fieldLabel}>
                Description
                <textarea
                  style={styles.textArea}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  onKeyDown={handleTabIndent}
                />
              </label>

              <label style={styles.fieldLabel}>
                Description (Spanish)
                <textarea
                  style={styles.textArea}
                  value={createForm.description_spanish}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, description_spanish: e.target.value }))
                  }
                  onKeyDown={handleTabIndent}
                />
              </label>

              <label style={styles.fieldLabel}>
                Tags
                <div style={styles.tagPicker}>
                  {allTags.map((tag) => {
                    const selected = createForm.tags.some((t) => t.id === tag.id);
                    return (
                      <span
                        key={tag.id}
                        onClick={() => toggleCreateTag(tag)}
                        style={selected ? tagOptionSelectedStyle(tag.color) : tagOptionStyle(tag.color)}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              </label>

              {createError && (
                <p style={{ ...styles.message, color: "#e57373" }}>{createError}</p>
              )}

              <div style={styles.editActions}>
                <button style={styles.saveButton} onClick={saveCreate} disabled={createSaving}>
                  {createSaving ? "Creating…" : "Create"}
                </button>
                <button style={styles.cancelButton} onClick={cancelCreate} disabled={createSaving}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{...styles.message, color: "#ffffff"}}>Loading activities…</p>
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
                  <svg
                    style={styles.starIcon}
                    viewBox="0 0 24 24"
                    fill={activity.starred ? "#f5c518" : "none"}
                    stroke={activity.starred ? "#f5c518" : "#9a9aa2"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.63 22 9.24 16.5 13.97 18.18 21 12 17.27 5.82 21 7.5 13.97 2 9.24 8.91 8.63 12 2" />
                  </svg>
                  <span style={styles.cardName}>{activity.name}</span>
                  {!isExpanded && <HeaderTagList tags={activity.tags} />}
                  <span
                    style={{
                      display: "inline-block",
                      gridColumn: "4",
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
                        <label style={styles.starredCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={editForm.starred}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, starred: e.target.checked }))
                            }
                          />
                          Starred
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

                        <div style={styles.editActionsRow}>
                          <div style={styles.editActions}>
                            <button
                              style={styles.saveButton}
                              onClick={() => saveEdit(activity.id)}
                              disabled={saving}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button style={styles.cancelButton} onClick={cancelEdit} disabled={saving}>
                              Cancel
                            </button>
                          </div>

                          <button
                            style={styles.deleteButton}
                            className="delete-button"
                            onClick={() => askDelete(activity.id)}
                          >
                            Delete
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
                        <button style={styles.editButton} onClick={() => startEdit(activity)}>
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
      {confirmingDeleteId !== null && (
        <div style={styles.modalOverlay} onClick={cancelDelete}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Delete activity?</p>
            <p style={styles.modalText}>
              {activities.find((a) => a.id === confirmingDeleteId)?.name}
            </p>
            <p style={styles.modalSubtext}>This can't be undone.</p>

            {deleteError && (
              <p style={{ ...styles.message, color: "#e57373", fontSize: 13 }}>{deleteError}</p>
            )}

            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={styles.deleteConfirmButton}
                onClick={() => confirmDelete(confirmingDeleteId)}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
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
    gridTemplateColumns: "20px 1fr minmax(0, 40%) 24px",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    cursor: "pointer",
  },
  cardName: {
    fontWeight: 500,
    justifySelf: "start",
    textAlign: "left",
    marginLeft: 0,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  starIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
    justifySelf: "center",
    alignSelf: "center",
  },
  starredCheckboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#c9c9d1",
    cursor: "pointer",
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
    alignItems: "flex-start",
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
    textAlign: "left" as const,
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
  editActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
  detailActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #e57373",
    backgroundColor: "transparent",
    color: "#e57373",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  deleteConfirm: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  deleteConfirmText: {
    fontSize: 12,
    color: "#c9c9d1",
  },
  deleteConfirmButton: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#e57373",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
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
  searchRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  searchWrapper: {
    position: "relative" as const,
    flex: 1,
    minWidth: 0,
  },
  // ...
  refreshButton: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    color: "#c9c9d1",
    cursor: "pointer",
  },
  refreshButtonActive: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 6,
    border: "1px solid #5b8def",
    backgroundColor: "#5b8def",
    color: "#ffffff",
    cursor: "pointer",
    flexShrink: 0,
  },
  addActivityButton: {
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    padding: "0 12px",
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    color: "#5b8def",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
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
    gap: 8,
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

  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 16,
  },
  modalBox: {
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 10,
    padding: 20,
    width: "min(340px, 100%)",
    boxSizing: "border-box" as const,
  },
  modalTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: "#ffffff",
  },
  modalText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#c9c9d1",
  },
  modalSubtext: {
    margin: "4px 0 16px",
    fontSize: 12,
    color: "#9a9aa2",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
};
