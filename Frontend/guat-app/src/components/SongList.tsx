// src/components/SongList.tsx

import { useEffect, useState , Fragment } from "react";
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from "../api/apiClient";

const SONG_ENDPOINT = "/song/";
const VERSE_ENDPOINT = "/verse/";

interface Verse {
  id: number;
  order: number;
  name: string;
  lyrics: string;
  lyrics_spanish: string;
  lyrics_phonetic: string;
}

interface Song {
  id: number;
  name: string;
  name_spanish: string;
  url: string;
  created_date: string;
  verses: Verse[];
}

interface EditVerse extends Omit<Verse, "id"> {
  id: number | string;
  isNew?: boolean;
}

interface EditDraft {
  name: string;
  name_spanish: string;
  url: string;
  verses: EditVerse[];
}

type LyricKind = "phonetic" | "spanish" | "english";

export default function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshPressed, setRefreshPressed] = useState(false);

  const [addingSong, setAddingSong] = useState(false);
  const [newSongDraft, setNewSongDraft] = useState<EditDraft>({ name: "", name_spanish: "", url: "", verses: [] });
  const [newSongError, setNewSongError] = useState<string | null>(null);
  const [creatingSong, setCreatingSong] = useState(false);

  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [deletedVerseIds, setDeletedVerseIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadSongs(showFullLoading: boolean) {
    if (showFullLoading) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await apiGet<Song[]>(SONG_ENDPOINT);
      setSongs(data);
    } catch (err) {
      setError(err instanceof ApiError ? `Request failed (${err.status})` : "Failed to load songs");
    } finally {
      if (showFullLoading) setLoading(false);
      else setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSongs(true);
  }, []);

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const sortedSongs = [...songs].sort(
    (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );

  const filteredSongs = sortedSongs.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name_spanish.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function startAddSong() {
    setAddingSong(true);
    setNewSongDraft({ name: "", name_spanish: "", url: "", verses: [] });
    setNewSongError(null);
  }

  function cancelAddSong() {
    setAddingSong(false);
    setNewSongDraft({ name: "", name_spanish: "", url: "", verses: [] });
    setNewSongError(null);
  }

  function updateNewSongField<K extends keyof EditDraft>(field: K, value: EditDraft[K]) {
    setNewSongDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateNewSongVerse(verseId: number | string, field: keyof EditVerse, value: string | number) {
    setNewSongDraft((prev) => ({
      ...prev,
      verses: prev.verses.map((v) => (v.id === verseId ? { ...v, [field]: value } : v)),
    }));
  }

  function addNewSongVerse() {
    setNewSongDraft((prev) => ({
      ...prev,
      verses: [
        ...prev.verses,
        {
          id: `new-${Date.now()}`,
          order: prev.verses.length + 1,
          name: "",
          lyrics: "",
          lyrics_spanish: "",
          lyrics_phonetic: "",
          isNew: true,
        },
      ],
    }));
  }

  function removeNewSongVerse(verseId: number | string) {
    setNewSongDraft((prev) => ({ ...prev, verses: prev.verses.filter((v) => v.id !== verseId) }));
  }

  async function saveNewSong() {
    if (!newSongDraft.name_spanish.trim()) {
      setNewSongError("Spanish name is required.");
      return;
    }
    setNewSongError(null);
    setCreatingSong(true);
    try {
      const created = await apiPost<Song>("/song/", {
        name: newSongDraft.name,
        name_spanish: newSongDraft.name_spanish,
        url: newSongDraft.url,
      });
      if (!created) {
        setNewSongError("Song was created but the server didn't return it — refresh to see it.");
        return;
      }

      let latestSong: Song = created;
      for (const v of newSongDraft.verses) {
        latestSong =
          (await apiPost<Song>(`/song/${created.id}/verses/`, {
            order: v.order,
            name: v.name,
            lyrics: v.lyrics,
            lyrics_spanish: v.lyrics_spanish,
            lyrics_phonetic: v.lyrics_phonetic,
          })) ?? latestSong;
      }

      setSongs((prev) => [...prev, latestSong]);
      setAddingSong(false);
      setNewSongDraft({ name: "", name_spanish: "", url: "", verses: [] });
    } catch (err) {
      setNewSongError(err instanceof ApiError ? `Save failed (${err.status})` : "Failed to create song");
    } finally {
      setCreatingSong(false);
    }
  }

  function startEdit(song: Song) {
    setEditingSongId(song.id);
    setEditDraft({
      name: song.name,
      name_spanish: song.name_spanish,
      url: song.url,
      verses: [...song.verses].sort((a, b) => a.order - b.order).map((v) => ({ ...v })),
    });
    setDeletedVerseIds([]);
    setExpandedIds((prev) => new Set(prev).add(song.id));
  }

  function cancelEdit() {
    setEditingSongId(null);
    setEditDraft(null);
    setDeletedVerseIds([]);
  }

  function updateDraft<K extends keyof EditDraft>(field: K, value: EditDraft[K]) {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateVerse(verseId: number | string, field: keyof EditVerse, value: string | number) {
    setEditDraft((prev) =>
      prev
        ? { ...prev, verses: prev.verses.map((v) => (v.id === verseId ? { ...v, [field]: value } : v)) }
        : prev
    );
  }

  function addVerse() {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            verses: [
              ...prev.verses,
              {
                id: `new-${Date.now()}`,
                order: prev.verses.length + 1,
                name: "",
                lyrics: "",
                lyrics_spanish: "",
                lyrics_phonetic: "",
                isNew: true,
              },
            ],
          }
        : prev
    );
  }

  function removeVerse(verseId: number | string) {
    setEditDraft((prev) => (prev ? { ...prev, verses: prev.verses.filter((v) => v.id !== verseId) } : prev));
    if (typeof verseId === "number") setDeletedVerseIds((prev) => [...prev, verseId]);
  }

  async function saveEdit(songId: number) {
    if (!editDraft) return;
    setSaving(true);
    try {
      await apiPatch<Song>(`/song/${songId}/`, {
        name: editDraft.name,
        name_spanish: editDraft.name_spanish,
        url: editDraft.url,
      });

      await Promise.all(deletedVerseIds.map((id) => apiDelete(`${VERSE_ENDPOINT}${id}/`)));

      await Promise.all(
        editDraft.verses
          .filter((v) => !v.isNew)
          .map((v) =>
            apiPatch<Verse>(`${VERSE_ENDPOINT}${v.id}/`, {
              order: v.order,
              name: v.name,
              lyrics: v.lyrics,
              lyrics_spanish: v.lyrics_spanish,
              lyrics_phonetic: v.lyrics_phonetic,
            })
          )
      );

      // POST new verses — each returns the whole Song, not the Verse,
      // so keep the last one as the source of truth for the final verse list
      let latestSong: Song | null = null;
      for (const v of editDraft.verses.filter((v) => v.isNew)) {
        latestSong = await apiPost<Song>(`/song/${songId}/verses/`, {
          order: v.order,
          name: v.name,
          lyrics: v.lyrics,
          lyrics_spanish: v.lyrics_spanish,
          lyrics_phonetic: v.lyrics_phonetic,
        });
      }

      const finalVerses: Verse[] =
        latestSong?.verses ??
        editDraft.verses.map((v) => ({
          id: v.id as number,
          order: v.order,
          name: v.name,
          lyrics: v.lyrics,
          lyrics_spanish: v.lyrics_spanish,
          lyrics_phonetic: v.lyrics_phonetic,
        }));

      setSongs((prev) =>
        prev.map((s) =>
          s.id === songId
            ? { ...s, name: editDraft.name, name_spanish: editDraft.name_spanish, url: editDraft.url, verses: finalVerses }
            : s
        )
      );
      setEditingSongId(null);
      setEditDraft(null);
      setDeletedVerseIds([]);
    } catch (err) {
      setError(err instanceof ApiError ? `Save failed (${err.status})` : "Failed to save song");
    } finally {
      setSaving(false);
    }
  }

  function cancelDelete() {
    setConfirmingDeleteId(null);
    setDeleteError(null);
  }

  async function confirmDelete(songId: number) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/song/${songId}/`);
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      setEditingSongId(null);
      setEditDraft(null);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      setConfirmingDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? `Delete failed (${err.status})` : "Failed to delete song");
    } finally {
      setDeleting(false);
    }
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
          onClick={() => loadSongs(false)}
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
        <button style={styles.addSongButton} onClick={startAddSong} aria-label="Add song">
          + Add Song
        </button>
      </div>

      {loading ? (
        <p style={styles.message}>Loading songs…</p>
      ) : error ? (
        <p style={{ ...styles.message, color: "#e57373" }}>{error}</p>
      ) : songs.length === 0 ? (
        <p style={styles.message}>No songs found.</p>
      ) : (
        <div style={styles.list}>
          {addingSong && (
            <div style={{ ...styles.card, backgroundColor: DEFAULT_CARD_BG }}>
              <div style={styles.cardDetail}>
                <label style={styles.fieldLabel}>Spanish name *</label>
                <input style={styles.fieldInput} value={newSongDraft.name_spanish} onChange={(e) => updateNewSongField("name_spanish", e.target.value)} />
                <label style={styles.fieldLabel}>English name</label>
                <input style={styles.fieldInput} value={newSongDraft.name} onChange={(e) => updateNewSongField("name", e.target.value)} />
                <label style={styles.fieldLabel}>Song link</label>
                <input style={styles.fieldInput} value={newSongDraft.url} onChange={(e) => updateNewSongField("url", e.target.value)} />

                <div style={styles.verseEditList}>
                  {newSongDraft.verses.map((verse) => (
                    <div key={verse.id} style={styles.verseEditCard}>
                      <div style={styles.verseEditHeader}>
                        <input style={styles.orderInput} type="number" value={verse.order} onChange={(e) => updateNewSongVerse(verse.id, "order", Number(e.target.value))} />
                        <input style={{ ...styles.fieldInput, flex: 1 }} placeholder="Verse name" value={verse.name} onChange={(e) => updateNewSongVerse(verse.id, "name", e.target.value)} />
                        <button style={styles.removeVerseButton} onClick={() => removeNewSongVerse(verse.id)}>✕</button>
                      </div>
                      <label style={styles.verseFieldLabel}>Phonetic</label>
                      <textarea style={styles.textArea} value={verse.lyrics_phonetic} onChange={(e) => updateNewSongVerse(verse.id, "lyrics_phonetic", e.target.value)} />
                      <label style={styles.verseFieldLabel}>Spanish</label>
                      <textarea style={styles.textArea} value={verse.lyrics_spanish} onChange={(e) => updateNewSongVerse(verse.id, "lyrics_spanish", e.target.value)} />
                      <label style={styles.verseFieldLabel}>English</label>
                      <textarea style={styles.textArea} value={verse.lyrics} onChange={(e) => updateNewSongVerse(verse.id, "lyrics", e.target.value)} />
                    </div>
                  ))}
                </div>

                <button style={styles.addVerseButton} onClick={addNewSongVerse}>+ Add verse</button>

                {newSongError && <p style={styles.newSongError}>{newSongError}</p>}

                <div style={styles.editActions}>
                  <button style={styles.cancelButton} onClick={cancelAddSong} disabled={creatingSong}>Cancel</button>
                  <button style={styles.saveButton} onClick={saveNewSong} disabled={creatingSong}>{creatingSong ? "Saving…" : "Save"}</button>
                </div>
              </div>
            </div>
          )}
          {filteredSongs.map((song) => {
            const isExpanded = expandedIds.has(song.id);
            const orderedVerses = [...song.verses].sort((a, b) => a.order - b.order);

            return (
              <div key={song.id} style={{ ...styles.card, backgroundColor: DEFAULT_CARD_BG }}>
                <div
                  style={{
                    ...styles.cardHeader,
                    alignItems: isExpanded ? "flex-start" : "center",
                  }}
                  onClick={() => toggleExpanded(song.id)}
                >
                  <div style={styles.cardName}>
                    <div>{song.name_spanish}</div>
                    <div style={styles.englishTitle}>{song.name}</div>
                  </div>
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
                    {editingSongId === song.id && editDraft ? (
                      <>
                        <label style={styles.fieldLabel}>Spanish name</label>
                        <input style={styles.fieldInput} value={editDraft.name_spanish} onChange={(e) => updateDraft("name_spanish", e.target.value)} />
                        <label style={styles.fieldLabel}>English name</label>
                        <input style={styles.fieldInput} value={editDraft.name} onChange={(e) => updateDraft("name", e.target.value)} />
                        <label style={styles.fieldLabel}>Song link</label>
                        <input style={styles.fieldInput} value={editDraft.url} onChange={(e) => updateDraft("url", e.target.value)} />

                        <div style={styles.verseEditList}>
                          {editDraft.verses.map((verse) => (
                            <div key={verse.id} style={styles.verseEditCard}>
                              <div style={styles.verseEditHeader}>
                                <input style={styles.orderInput} type="number" value={verse.order} onChange={(e) => updateVerse(verse.id, "order", Number(e.target.value))} />
                                <input style={{ ...styles.fieldInput, flex: 1 }} placeholder="Verse name" value={verse.name} onChange={(e) => updateVerse(verse.id, "name", e.target.value)} />
                                <button style={styles.removeVerseButton} onClick={() => removeVerse(verse.id)}>✕</button>
                              </div>
                              <label style={styles.verseFieldLabel}>Phonetic Lyrics</label>
                              <textarea style={styles.textArea} placeholder="Phonetic lyrics" value={verse.lyrics_phonetic} onChange={(e) => updateVerse(verse.id, "lyrics_phonetic", e.target.value)} />

                              <label style={styles.verseFieldLabel}>Spanish Lyrics</label>
                              <textarea style={styles.textArea} placeholder="Spanish lyrics" value={verse.lyrics_spanish} onChange={(e) => updateVerse(verse.id, "lyrics_spanish", e.target.value)} />

                              <label style={styles.verseFieldLabel}>English Lyrics</label>
                              <textarea style={styles.textArea} placeholder="English lyrics" value={verse.lyrics} onChange={(e) => updateVerse(verse.id, "lyrics", e.target.value)} />
                            </div>
                          ))}
                        </div>

                        <button style={styles.addVerseButton} onClick={addVerse}>+ Add verse</button>

                        <div style={styles.editActionsRow}>
                          <div style={styles.editActions}>
                            <button style={styles.saveButton} onClick={() => saveEdit(song.id)} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                            <button style={styles.cancelButton} onClick={cancelEdit} disabled={saving}>Cancel</button>
                          </div>
                          <button style={styles.deleteSongButton} onClick={() => setConfirmingDeleteId(song.id)} disabled={saving}>
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {song.url && (
                          <a href={song.url} target="_blank" rel="noopener noreferrer" style={styles.playLink}>▸ Song Link</a>
                        )}
                        <ol style={styles.verseList}>
                          {orderedVerses.map((verse) => (
                            <li key={verse.id} style={styles.verseItem}>
                              <div style={styles.verseContent}>
                                <div style={styles.detailLabel}>({verse.name})</div>
                                {(() => {
                                  const phoneticLines = verse.lyrics_phonetic.split("\n");
                                  const spanishLines = verse.lyrics_spanish.split("\n");
                                  const englishLines = verse.lyrics.split("\n");
                                  const maxLines = Math.max(phoneticLines.length, spanishLines.length, englishLines.length);
                                  return Array.from({ length: maxLines }).map((_, index) => (
                                    <Fragment key={index}>
                                      <div style={styles.verseGap}>
                                        {phoneticLines[index] && <p style={verseLineStyle("phonetic")}>{phoneticLines[index]}</p>}
                                        {spanishLines[index] && <p style={verseLineStyle("spanish")}>{spanishLines[index]}</p>}
                                        {englishLines[index] && <p style={verseLineStyle("english")}>{englishLines[index]}</p>}
                                      </div>
                                    </Fragment>
                                  ));
                                })()}
                              </div>
                            </li>
                          ))}
                        </ol>
                        <button style={styles.editButton} onClick={() => startEdit(song)}>✏ Edit</button>
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
          <p style={styles.modalTitle}>Delete song?</p>
          <p style={styles.modalText}>
            {songs.find((s) => s.id === confirmingDeleteId)?.name_spanish}
          </p>
          <p style={styles.modalSubtext}>This can't be undone.</p>

          {deleteError && (
            <p style={{ ...styles.message, color: "#e57373", fontSize: 13 }}>{deleteError}</p>
          )}

          <div style={styles.modalActions}>
            <button style={styles.cancelButton} onClick={cancelDelete} disabled={deleting}>
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

function verseLineStyle(kind: LyricKind): React.CSSProperties {
  if (kind === "phonetic") {
    return {
      margin: 0,
      marginBottom: 1, // closer to Spanish
      fontStyle: "italic",
      textAlign: "left",
      color: "#c5c5cf",
      fontSize: 13,
      lineHeight: 1.3,
      whiteSpace: "pre-line",
    };
  }

  if (kind === "english") {
    return {
      margin: 0,
      marginBottom: 1, 
      textAlign: "left",
      color: "#c9c9d1",
      fontSize: 12,
      lineHeight: 1.3,
      whiteSpace: "pre-line",
    };
  }

  // Spanish
  return {
    margin: 0,
    marginBottom: 1, 
    color: "#ffffff",
    textAlign: "left",
    fontSize: 14,
    lineHeight: 1.3,
    whiteSpace: "pre-line",
  };
}


const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    color: "#ffffff",
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
    overflow: "hidden",
    transition: "background-color 0.15s ease",
  },
  cardHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 24px",
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
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  englishTitle: {
    fontSize: "0.85rem",
    opacity: 0.7,
    marginTop: "4px",
  },
  cardDetail: {
    borderTop: "1px solid #e2e2e2",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    textAlign: "left",
    letterSpacing: "0.04em",
    color: "#ffffff",
    fontWeight: 600,
    marginBottom: 4,
  },
  verseList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  verseGap: {
    marginBottom: 8
  },
  verseItem: {
    display: "flex",
    gap: 10,
  },
  verseContent: {
    minWidth: 0,
  },
  verseFieldLabel: {
    fontSize: 10,
    textTransform: "uppercase" as const,
    textAlign: "left",
    letterSpacing: "0.04em",
    color: "#9a9aa2",
    fontWeight: 600,
    marginBottom: -2,
    marginLeft: 4
  },
  playLink: {
    alignSelf: "flex-start",
    fontSize: 13,
    fontWeight: 500,
    color: "#5b8def",
    textDecoration: "none",
  },
  searchWrapper: {
    position: "relative" as const,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
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
  fieldLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "#9a9aa2",
    fontWeight: 600,
  },
  fieldInput: {
    fontFamily: "inherit",
    fontSize: 14,
    color: "#ffffff",
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "6px 10px",
    width: "100%",
    boxSizing: "border-box" as const,
    marginBottom: 4,
  },
  verseEditList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginTop: 8,
  },
  verseEditCard: {
    border: "1px solid #45454d",
    borderRadius: 8,
    padding: 10,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    backgroundColor: "#1c1d21",
  },
  verseEditHeader: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  orderInput: {
    width: 44,
    fontFamily: "inherit",
    fontSize: 13,
    color: "#ffffff",
    backgroundColor: "#2d2e33",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "6px 6px",
    boxSizing: "border-box" as const,
  },
  removeVerseButton: {
    background: "none",
    border: "none",
    color: "#e57373",
    cursor: "pointer",
    fontSize: 14,
    padding: "4px 6px",
  },
  textArea: {
    fontFamily: "inherit",
    fontSize: 13,
    color: "#ffffff",
    backgroundColor: "#2d2e33",
    border: "1px solid #45454d",
    borderRadius: 6,
    padding: "8px 10px",
    width: "100%",
    boxSizing: "border-box" as const,
    minHeight: 90,
    resize: "vertical" as const,
  },
  addVerseButton: {
    alignSelf: "flex-start",
    background: "none",
    border: "1px dashed #45454d",
    borderRadius: 6,
    color: "#5b8def",
    cursor: "pointer",
    fontSize: 13,
    padding: "6px 10px",
    marginTop: 6,
  },
  editActions: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  editActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cancelButton: {
    background: "none",
    border: "1px solid #45454d",
    borderRadius: 6,
    color: "#c9c9d1",
    cursor: "pointer",
    fontSize: 13,
    padding: "6px 14px",
  },
  saveButton: {
    background: "#5b8def",
    border: "none",
    borderRadius: 6,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 14px",
  },
  deleteSongButton: {
    background: "none",
    border: "1px solid #e57373",
    borderRadius: 6,
    color: "#e57373",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 14px",
  },
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
  addSongButton: {
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
  newSongError: {
    color: "#e57373",
    fontSize: 12,
    margin: 0,
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalBox: {
    backgroundColor: "#1c1d21",
    border: "1px solid #45454d",
    borderRadius: 12,
    padding: 20,
    width: "min(90vw, 360px)",
    boxSizing: "border-box" as const,
  },
  modalTitle: {
    margin: 0,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: 600,
    color: "#ffffff",
  },
  modalText: {
    margin: 0,
    marginBottom: 4,
    fontSize: 14,
    color: "#c9c9d1",
  },
  modalSubtext: {
    margin: 0,
    marginBottom: 14,
    fontSize: 12,
    color: "#9a9aa2",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  deleteConfirmButton: {
    background: "#e57373",
    border: "none",
    borderRadius: 6,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 14px",
  },
};