"use client";

import { useState } from "react";

const SERVICES = ["Service 1", "Service 2", "Service 3"];

type FormState = {
  name: string;
  phone: string;
  city: string;
  serviceName: string;
  description: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  city: "",
  serviceName: "Service 1",
  description: "",
};

export function LeadForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({
    type: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: payload.error ?? "Unable to create lead." });
      setIsSubmitting(false);
      return;
    }

    setForm(initialForm);
    setStatus({
      type: "success",
      message: "Lead saved and allocated to exactly three providers.",
    });
    setIsSubmitting(false);
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <label>
        <span>Name</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
          maxLength={100}
        />
      </label>
      <label>
        <span>Phone Number</span>
        <input
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          required
          inputMode="tel"
          placeholder="+919876543210"
          maxLength={16}
        />
      </label>
      <label>
        <span>City</span>
        <input
          value={form.city}
          onChange={(event) => setForm({ ...form, city: event.target.value })}
          required
          maxLength={80}
        />
      </label>
      <label>
        <span>Service Type</span>
        <select
          value={form.serviceName}
          onChange={(event) => setForm({ ...form, serviceName: event.target.value })}
          required
        >
          {SERVICES.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Description</span>
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          required
          rows={5}
          maxLength={1000}
        />
      </label>
      <button className="button primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit Lead"}
      </button>
      {status.type !== "idle" ? (
        <p className={status.type === "success" ? "notice success" : "notice error"}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
