import { useState } from "react";
import TabBar, { type TabDef } from "./components/TabBar";
import ActivityList from "./components/ActivityList"

type TabId = "activities" | "manage";

const TABS: TabDef<TabId>[] = [
  { id: "activities", label: "Activities" },
  { id: "manage", label: "Manage"}
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("activities");

  return(
    <div style={styles.pageWrapper}>
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "activities" && <ActivityList />}
      {activeTab === "manage" && <ActivityList />}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    display: "flex",
    flexDirection: "column" as const,
  },
};

export default App