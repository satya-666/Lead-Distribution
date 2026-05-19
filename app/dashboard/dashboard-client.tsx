"use client";

import { useCallback, useEffect, useState } from "react";

type Lead = {
  id: string;
  assignmentId: string;
  name: string;
  phone: string;
  city: string;
  serviceName: string;
  description: string;
  assignedAt: string;
};

type Provider = {
  id: string;
  name: string;
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  leadsReceivedCount: number;
  leads: Lead[];
};

export function DashboardClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState("Loading dashboard...");

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to load dashboard.");
      return;
    }

    setProviders(payload.providers);
    setStatus("Live");
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.addEventListener("dashboard:update", () => {
      loadDashboard();
    });

    source.onerror = () => {
      setStatus("Reconnecting...");
    };

    return () => {
      source.close();
    };
  }, [loadDashboard]);

  return (
    <>
      <div className="status-row">
        <span className="live-dot" aria-hidden="true" />
        <span>{status}</span>
      </div>
      <div className="provider-grid">
        {providers.map((provider) => (
          <article className="provider-card" key={provider.id}>
            <div className="provider-topline">
              <h2>{provider.name}</h2>
              <span>{provider.remainingQuota} left</span>
            </div>
            <dl className="metrics">
              <div>
                <dt>Used</dt>
                <dd>
                  {provider.usedQuota}/{provider.monthlyQuota}
                </dd>
              </div>
              <div>
                <dt>Leads</dt>
                <dd>{provider.leadsReceivedCount}</dd>
              </div>
            </dl>
            <div className="lead-list">
              {provider.leads.length === 0 ? (
                <p className="empty">No assigned leads yet.</p>
              ) : (
                provider.leads.map((lead) => (
                  <div className="lead-row" key={lead.assignmentId}>
                    <div>
                      <strong>{lead.name}</strong>
                      <span>
                        {lead.serviceName} · {lead.city}
                      </span>
                    </div>
                    <small>{lead.phone}</small>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
