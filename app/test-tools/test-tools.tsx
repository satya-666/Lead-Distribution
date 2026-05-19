"use client";

import { useState } from "react";

type LogItem = {
  id: string;
  message: string;
};

function createEventId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function TestTools() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  async function resetQuota() {
    const eventId = createEventId("manual-quota-reset");
    await callWebhook(eventId, "Quota reset webhook processed.");
  }

  async function callWebhookMultipleTimes() {
    const eventId = createEventId("idempotency-demo");
    setIsBusy(true);
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch("/api/webhook/quota-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        }).then((response) => response.json()),
      ),
    );
    const processedCount = responses.filter((response) => response.processed).length;
    addLog(`Called same webhook event 3 times. Processed resets: ${processedCount}.`);
    setIsBusy(false);
  }

  async function generateLeads() {
    setIsBusy(true);
    const response = await fetch("/api/test/generate-leads", { method: "POST" });
    const payload = await response.json();
    addLog(`Generated ${payload.created} leads. Failures: ${payload.failed.length}.`);
    setIsBusy(false);
  }

  async function callWebhook(eventId: string, successMessage: string) {
    setIsBusy(true);
    const response = await fetch("/api/webhook/quota-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const payload = await response.json();

    if (!response.ok) {
      addLog(payload.error ?? "Webhook failed.");
    } else {
      addLog(`${successMessage} Event processed: ${payload.processed}.`);
    }

    setIsBusy(false);
  }

  function addLog(message: string) {
    setLogs((current) => [{ id: crypto.randomUUID(), message }, ...current].slice(0, 8));
  }

  return (
    <div className="tool-panel">
      <button className="button primary" disabled={isBusy} onClick={resetQuota} type="button">
        Reset Provider Quota to 10
      </button>
      <button className="button" disabled={isBusy} onClick={callWebhookMultipleTimes} type="button">
        Call Webhook Multiple Times
      </button>
      <button className="button" disabled={isBusy} onClick={generateLeads} type="button">
        Generate 10 Leads Instantly
      </button>
      <div className="log-box" aria-live="polite">
        {logs.length === 0 ? (
          <p>No test actions yet.</p>
        ) : (
          logs.map((log) => <p key={log.id}>{log.message}</p>)
        )}
      </div>
    </div>
  );
}
