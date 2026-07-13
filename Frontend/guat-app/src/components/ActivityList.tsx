// src/components/ActivityList.tsx
//
// Fetches every Activity from the backend and renders one row per activity.
//
// I don't know your Activity model's actual fields, so this assumes a
// common shape (id, name, date, description). Update the `Activity`
// interface and the <td> cells below to match your real Django model/
// serializer fields, and update `ACTIVITY_ENDPOINT` if your route isn't /activities.

import { Fragment, useEffect, useState } from "react";
import { apiGet, ApiError } from "../api/apiClient";

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
  starred: boolean
}

interface ActivitiesListProps {
  activities: Activity[];
  // Wire this up to your backend PATCH/PUT endpoint
  onUpdateActivity?: (
    id: string,
    updates: { name: string; description: string; description_spanish: string }
  ) => void | Promise<void>;
}

export default function ActivityList() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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
            const bgColor = DEFAULT_CARD_BG;

            return (
              <div
                key={activity.id}
                style={{ ...styles.card, backgroundColor: bgColor }}
              >
                <div
                  style={styles.cardHeader}
                  onClick={() => toggleExpanded(activity.id)}
                >
                  <span style={styles.cardName}>{activity.name}</span>

                  <div style={styles.tagList}>
                    {activity.tags.map((tag) => (
                      <span
                        key={tag.id}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          border: `1px solid ${tag.color}`,
                          borderRadius: 6,
                          color: tag.color,
                          fontSize: 12,
                          fontWeight: 500,
                          lineHeight: "18px",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
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
                    {/* PLACEHOLDER — replace with your real "more detail"
                        fields once you know the full Activity shape
                        (e.g. location, notes, created_at, participants) */}
                    <pre style={styles.detailPre}>
                      {JSON.stringify(activity, null, 2)}
                    </pre>
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

const DEFAULT_CARD_BG = "#2d2e33"

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
    gridTemplateColumns: "1fr auto 24px",
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
    minWidth: 0,            // let the track shrink instead of forcing overflow
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    justifySelf: "end",
  },
  cardDetail: {
    borderTop: "1px solid #e2e2e2",
    padding: "12px 16px",
  },
  detailPre: {
    margin: 0,
    fontSize: 12,
    whiteSpace: "pre-wrap" as const,
  },
};