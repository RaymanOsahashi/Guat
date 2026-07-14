// src/components/TabBar.tsx

import React from "react";

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string = string> {
  tabs: TabDef<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
}

export default function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
}: TabBarProps<T>) {
  return (
    <div style={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={{
            ...styles.tabButton,
            ...(activeTab === tab.id ? styles.tabButtonActive : {}),
          }}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabBar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    gap: 4,
    padding: "0 16px",
    backgroundColor: "#1c1d21",
    borderBottom: "1px solid #45454d",
  },
  tabButton: {
    padding: "10px 16px",
    border: "none",
    borderBottom: "2px solid transparent",
    backgroundColor: "transparent",
    color: "#9a9aa2",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  tabButtonActive: {
    color: "#ffffff",
    borderBottom: "2px solid #5b8def",
  },
};