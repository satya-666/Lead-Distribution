import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <section className="shell">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Live provider data</p>
          <h1>Provider Dashboard</h1>
        </div>
      </div>
      <DashboardClient />
    </section>
  );
}
