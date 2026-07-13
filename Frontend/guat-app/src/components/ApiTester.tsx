// src/components/ApiTester.tsx
//
// Drop this component anywhere (e.g. render it on your home page during dev)
// to click-test your API endpoints and see the raw response.
//
// Replace the `endpoints` array below with your real routes.

import { useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from "../api/apiClient";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface TestEndpoint {
  label: string;
  method: Method;
  path: string;
  /** Only used for POST/PUT */
  body?: unknown;
}

const endpoints: TestEndpoint[] = [
  { label: "List activities", method: "GET", path: "/activity/" },
  { label: "List tags", method: "GET", path: "/tag/" },
  {
    label: "Create activity",
    method: "POST",
    path: "/activity/",
    body: { name: "Sample Activity",
            description: "Sample description"
          },
  },
  {
    label: "Update item #1",
    method: "PUT",
    path: "/items/1",
    body: { name: "Updated item" },
  },
  { label: "Delete item #1", method: "DELETE", path: "/items/1" },
];

interface ResultState {
  label: string;
  status: "success" | "error";
  data: unknown;
}

export default function ApiTester() {
  const [result, setResult] = useState<ResultState | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  async function runTest(endpoint: TestEndpoint) {
    setLoadingLabel(endpoint.label);
    setResult(null);

    try {
      let data: unknown;
      switch (endpoint.method) {
        case "GET":
          data = await apiGet(endpoint.path);
          break;
        case "POST":
          data = await apiPost(endpoint.path, endpoint.body);
          break;
        case "PUT":
          data = await apiPut(endpoint.path, endpoint.body);
          break;
        case "DELETE":
          data = await apiDelete(endpoint.path);
          break;
      }
      setResult({ label: endpoint.label, status: "success", data });
    } catch (err) {
      const data = err instanceof ApiError ? { status: err.status, body: err.body } : String(err);
      setResult({ label: endpoint.label, status: "error", data });
    } finally {
      setLoadingLabel(null);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>API Tester</h2>

      <div style={styles.buttonRow}>
        {endpoints.map((endpoint) => (
          <button
            key={endpoint.label}
            onClick={() => runTest(endpoint)}
            disabled={loadingLabel !== null}
            style={styles.button}
          >
            {loadingLabel === endpoint.label ? "Running…" : `${endpoint.method} — ${endpoint.label}`}
          </button>
        ))}
      </div>

      {result && (
        <div style={styles.resultBox}>
          <div
            style={{
              ...styles.resultHeader,
              color: result.status === "success" ? "#1a7f37" : "#c0392b",
            }}
          >
            {result.label}: {result.status}
          </div>
          <pre style={styles.pre}>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, sans-serif",
    padding: 16,
    maxWidth: 640,
  },
  heading: {
    marginBottom: 12,
  },
  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #999",
    background: "#f5f5f5",
    color: "#111",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  resultBox: {
    marginTop: 16,
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: 12,
    background: "#fafafa",
    color: "#111",
  },
  resultHeader: {
    fontWeight: 600,
    marginBottom: 8,
  },
  pre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 13,
  },
};
