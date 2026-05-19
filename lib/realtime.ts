import { EventEmitter } from "node:events";

const DASHBOARD_EVENT = "dashboard:update";

const globalForRealtime = globalThis as unknown as {
  dashboardEvents?: EventEmitter;
};

export const dashboardEvents = globalForRealtime.dashboardEvents ?? new EventEmitter();
dashboardEvents.setMaxListeners(100);

if (!globalForRealtime.dashboardEvents) {
  globalForRealtime.dashboardEvents = dashboardEvents;
}

export function publishDashboardUpdate() {
  dashboardEvents.emit(DASHBOARD_EVENT, {
    type: DASHBOARD_EVENT,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeDashboardUpdates(listener: (payload: unknown) => void) {
  dashboardEvents.on(DASHBOARD_EVENT, listener);

  return () => {
    dashboardEvents.off(DASHBOARD_EVENT, listener);
  };
}
