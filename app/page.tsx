import Link from "next/link";

export default function HomePage() {
  return (
    <section className="shell home-grid">
      <div>
        <p className="eyebrow">Production-style assignment build</p>
        <h1>Lead allocation with durable round-robin, quotas, and idempotent webhook resets.</h1>
        <p className="lede">
          Submit customer leads, watch providers receive exactly three assignments, and use the
          test panel to simulate quota reset webhooks and concurrent lead creation.
        </p>
        <div className="actions">
          <Link className="button primary" href="/request-service">
            Create Lead
          </Link>
          <Link className="button" href="/dashboard">
            View Dashboard
          </Link>
        </div>
      </div>
      <div className="summary-panel">
        <h2>Core guarantees</h2>
        <ul>
          <li>Phone plus service uniqueness is enforced by PostgreSQL.</li>
          <li>Allocation state is locked and persisted per service.</li>
          <li>Quota spending uses guarded atomic updates.</li>
          <li>Dashboard refreshes through Server-Sent Events.</li>
        </ul>
      </div>
    </section>
  );
}
