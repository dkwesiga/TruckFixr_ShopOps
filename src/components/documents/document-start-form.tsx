"use client";

import { useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VehicleOption {
  id: string;
  unitNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  companyName: string | null;
  vehicles: VehicleOption[];
}

function vehicleLabel(v: VehicleOption): string {
  const main = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
  const tag = [v.unitNumber && `#${v.unitNumber}`, v.plate].filter(Boolean).join(" - ");
  return tag ? `${main} (${tag})` : main;
}

/**
 * Start a new estimate or invoice: pick a customer, then optionally one of that
 * customer's vehicles, plus a first complaint/work note. Customer drives the
 * dependent vehicle list, so this is a client component.
 */
export function DocumentStartForm({
  customers,
  action,
  complaintLabel,
  complaintPlaceholder,
  submitLabel,
  initialCustomerId,
}: {
  customers: CustomerOption[];
  action: (formData: FormData) => Promise<void>;
  complaintLabel: string;
  complaintPlaceholder: string;
  submitLabel: string;
  initialCustomerId?: string;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [customerMode, setCustomerMode] = useState(customers.length === 0 ? "new" : "existing");
  const [vehicleMode, setVehicleMode] = useState<"none" | "existing" | "new">("none");
  const selected = customers.find((c) => c.id === customerId);
  const canUseExistingCustomer = customers.length > 0;

  return (
    <form action={action} className="industrial-card space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d8dbe5] bg-[#f9f9ff] p-1">
        <button
          type="button"
          disabled={!canUseExistingCustomer}
          onClick={() => setCustomerMode("existing")}
          className={`min-h-10 rounded-md px-3 text-sm font-semibold ${
            customerMode === "existing"
              ? "bg-white text-[#004787] shadow-sm"
              : "text-[#5f6673] disabled:opacity-45"
          }`}
        >
          Existing
        </button>
        <button
          type="button"
          onClick={() => {
            setCustomerMode("new");
            setVehicleMode("none");
          }}
          className={`min-h-10 rounded-md px-3 text-sm font-semibold ${
            customerMode === "new" ? "bg-white text-[#004787] shadow-sm" : "text-[#5f6673]"
          }`}
        >
          New customer
        </button>
      </div>

      <input type="hidden" name="customerMode" value={customerMode} />
      <input type="hidden" name="vehicleMode" value={vehicleMode} />

      {customerMode === "existing" ? (
        <Select
          label="Customer"
          name="customerId"
          required
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            setVehicleMode("none");
          }}
          placeholder="Select customer..."
          options={customers.map((c) => ({
            value: c.id,
            label: c.companyName ? `${c.name} (${c.companyName})` : c.name,
          }))}
        />
      ) : (
        <div className="space-y-3 rounded-lg border border-[#e3e6ee] bg-white p-4">
          <Input label="Customer name" name="newCustomerName" required placeholder="e.g. John Smith" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Company" name="newCustomerCompanyName" placeholder="e.g. Smith Logistics" />
            <Input label="Phone" name="newCustomerPhone" type="tel" placeholder="(555) 000-0000" />
          </div>
          <Input label="Email" name="newCustomerEmail" type="email" placeholder="john@example.com" />
        </div>
      )}

      {customerMode === "existing" && selected && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#d8dbe5] bg-[#f9f9ff] p-1">
            <button
              type="button"
              onClick={() => setVehicleMode("none")}
              className={`min-h-10 rounded-md px-2 text-sm font-semibold ${
                vehicleMode === "none" ? "bg-white text-[#004787] shadow-sm" : "text-[#5f6673]"
              }`}
            >
              No vehicle
            </button>
            <button
              type="button"
              disabled={selected.vehicles.length === 0}
              onClick={() => setVehicleMode("existing")}
              className={`min-h-10 rounded-md px-2 text-sm font-semibold ${
                vehicleMode === "existing"
                  ? "bg-white text-[#004787] shadow-sm"
                  : "text-[#5f6673] disabled:opacity-45"
              }`}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => setVehicleMode("new")}
              className={`min-h-10 rounded-md px-2 text-sm font-semibold ${
                vehicleMode === "new" ? "bg-white text-[#004787] shadow-sm" : "text-[#5f6673]"
              }`}
            >
              New
            </button>
          </div>

          {vehicleMode === "existing" && (
            <Select
              key={selected.id}
              label="Vehicle / unit"
              name="vehicleId"
              defaultValue=""
              placeholder="Select vehicle..."
              options={selected.vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
            />
          )}
        </div>
      )}

      {(customerMode === "new" || vehicleMode === "new") && (
        <div className="space-y-3 rounded-lg border border-[#e3e6ee] bg-white p-4">
          <p className="industrial-label">New vehicle</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit number" name="newVehicleUnitNumber" placeholder="e.g. T-12" />
            <Input label="Plate" name="newVehiclePlate" placeholder="e.g. ABC 123" />
          </div>
          <Input label="VIN" name="newVehicleVin" placeholder="17-character VIN" maxLength={17} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Year" name="newVehicleYear" type="number" placeholder="2019" min="1900" max="2099" />
            <Input label="Make" name="newVehicleMake" placeholder="Kenworth" />
            <Input label="Model" name="newVehicleModel" placeholder="T680" />
          </div>
        </div>
      )}

      <Textarea
        label={complaintLabel}
        name="complaint"
        placeholder={complaintPlaceholder}
        rows={3}
      />

      {customerMode === "existing" && selected && (
        <Link href={`/vehicles/new?customerId=${selected.id}`} className="-mt-2 inline-block text-xs font-semibold text-[#004787]">
          Open full vehicle form for {selected.name}
        </Link>
      )}

      <Button type="submit" size="lg" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
