"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            padding: "2.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: 24,
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            Application Error
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
