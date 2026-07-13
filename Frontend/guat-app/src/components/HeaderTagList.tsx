import { useEffect, useRef, useState } from "react";

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export default function HeaderTagList({ tags }: { tags: Tag[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useEffect(() => {
    function recompute() {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;

      const available = container.clientWidth;
      const gap = 6;
      const children = Array.from(measure.children) as HTMLElement[];

      let used = 0;
      let count = 0;
      for (const child of children) {
        const next = used + (count > 0 ? gap : 0) + child.offsetWidth;
        if (next > available) break;
        used = next;
        count++;
      }
      setVisibleCount(count);
    }

    recompute();
    const observer = new ResizeObserver(recompute);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [tags]);

  return (
    <div ref={containerRef} style={styles.headerTagList}>
      <div ref={measureRef} style={styles.tagMeasureRow} aria-hidden="true">
        {tags.map((tag) => (
          <span key={tag.id} style={tagStyle(tag.color)}>
            {tag.name}
          </span>
        ))}
      </div>

      {tags.slice(0, visibleCount).map((tag) => (
        <span key={tag.id} style={tagStyle(tag.color)}>
          {tag.name}
        </span>
      ))}
    </div>
  );
}

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
    flexShrink: 0, // guarantees tags never squish, only the JS count changes
  };
}

const styles: Record<string, React.CSSProperties> = {
    headerTagList: {
        position: "relative",
        display: "flex",
        gap: 6,
        justifyContent: "right", // keeps tags visually centered inside the box
        width: "100%",            // fill the grid track's actual width
        justifySelf: "stretch",   // was: "center" — this was the bug
        minWidth: 0,
        overflow: "hidden",
    },
    tagMeasureRow: {
        position: "absolute",
        top: 0,
        left: 0,
        visibility: "hidden",
        display: "flex",
        gap: 6,
        pointerEvents: "none" as const,
    },
}