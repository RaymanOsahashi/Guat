import { useState } from "react";
import TabBar, { type TabDef } from "./components/TabBar";
import ActivityList from "./components/ActivityList";
import Manager from "./components/Manager";
import SongList from "./components/SongList";

type TabId = "activities" | "manage" | "songs";

const TABS: TabDef<TabId>[] = [
  { id: "activities", label: "Activities" },
  { id: "songs", label: "Songs" },
  { id: "manage", label: "Manage Tags" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("activities");

  const [refreshKey, setRefreshKey] = useState(0);
  function handleDataChanged() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div style={styles.pageWrapper}>
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div style={tabPanelStyle(activeTab === "activities")}>
        <ActivityList refreshKey={refreshKey} />
      </div>
      <div style={tabPanelStyle(activeTab === "songs")}>
        <SongList/>
      </div>
      <div style={tabPanelStyle(activeTab === "manage")}>
        <Manager onDataChanged={handleDataChanged} />
      </div>
    </div>
  );
}

function tabPanelStyle(isActive: boolean): React.CSSProperties {
  return {
    display: isActive ? "block" : "none",
  };
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    display: "flex",
    flexDirection: "column" as const,
  },
};