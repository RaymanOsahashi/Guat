// src/components/SongList.tsx

import { useEffect, useState , Fragment } from "react";
import { apiGet, ApiError } from "../api/apiClient";

const SONG_ENDPOINT = "/song/";

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
  verses: Verse[];
}

type LyricKind = "phonetic" | "spanish" | "english";
type LyricKey = "lyrics" | "lyrics_spanish" | "lyrics_phonetic";

// Which lyric fields to stack per verse, and in what order.
// Phonetic first (pronunciation guide), Spanish right below it, English last as a translation reference.
const LYRIC_FIELDS: { key: LyricKey; kind: LyricKind; label: string }[] = [
  { key: "lyrics_phonetic", kind: "phonetic", label: "Phonetic" },
  { key: "lyrics_spanish", kind: "spanish", label: "Español" },
  { key: "lyrics", kind: "english", label: "English" },
];

export default function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSongs() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<Song[]>(SONG_ENDPOINT);
        if (!cancelled) setSongs(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? `Request failed (${err.status})` : "Failed to load songs"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSongs();
    return () => {
      cancelled = true;
    };
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

  const filteredSongs = songs.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name_spanish.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {loading ? (
        <p style={styles.message}>Loading songs…</p>
      ) : error ? (
        <p style={{ ...styles.message, color: "#e57373" }}>{error}</p>
      ) : songs.length === 0 ? (
        <p style={styles.message}>No songs found.</p>
      ) : (
        <div style={styles.list}>
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
                    {song.url && (
                      <a
                        href={song.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.playLink}
                      >
                        ▸ Play on YouTube
                      </a>
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

                              const maxLines = Math.max(
                                phoneticLines.length,
                                spanishLines.length,
                                englishLines.length
                              );

                              return Array.from({ length: maxLines }).map((_, index) => (
                                <Fragment key={index}>
                                  <div style={styles.verseGap}>
                                    {phoneticLines[index] && (
                                      <p style={verseLineStyle("phonetic")}>
                                        {phoneticLines[index]}
                                      </p>
                                    )}

                                    {spanishLines[index] && (
                                      <p style={verseLineStyle("spanish")}>
                                        {spanishLines[index]}
                                      </p>
                                    )}

                                    {englishLines[index] && (
                                      <p style={verseLineStyle("english")}>
                                        {englishLines[index]}
                                      </p>
                                    )}
                                  </div>
                                </Fragment>
                              ));
                            })()}
                          </div>
                        </li>
                      ))}
                    </ol>
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
      marginBottom: 10, // adds space after the English translation
      textAlign: "left",
      color: "#c9c9d1",
      fontSize: 14,
      lineHeight: 1.3,
      whiteSpace: "pre-line",
    };
  }

  // Spanish
  return {
    margin: 0,
    marginBottom: 1, // close to phonetic and English
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
    gap: 12,
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
};