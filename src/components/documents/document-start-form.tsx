"use client";

import { useMemo, useState } from "react";
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

function customerLabel(customer: CustomerOption): string {
  return customer.companyName ? `${customer.name} (${customer.companyName})` : customer.name;
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
  const initialCustomer = initialCustomerId ? customers.find((c) => c.id === initialCustomerId) : undefined;
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? "");
  const [customerQuery, setCustomerQuery] = useState(initialCustomer ? customerLabel(initialCustomer) : "");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(customers.length === 0 ? "new" : "existing");
  const [vehicleMode, setVehicleMode] = useState<"none" | "existing" | "new">("none");
  const selected = customers.find((c) => c.id === customerId);
  const canUseExistingCustomer = customers.length > 0;
  const customerMatches = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    const source = query
      ? customers.filter((customer) =>
          [
            customer.name,
            customer.companyName,
            ...customer.vehicles.map((vehicle) => vehicle.unitNumber),
            ...customer.vehicles.map((vehicle) => vehicle.plate),
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query))
        )
      : customers;

    return source.slice(0, 8);
  }, [customerQuery, customers]);

  return (
    <form action={action} className="industrial-card space-y-4 p-5">
      <p className="text-xs font-medium text-[#5f6673]">Required fields are marked <span className="text-[#d32f2f]">*</span></p>

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
            setNewCustomerName(customerQuery.trim());
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
        <div className="space-y-2">
          <input type="hidden" name="customerId" value={customerId} />
          <label className="block text-sm font-semibold text-[#424955]">
            Customer <span className="text-[#d32f2f]">*</span>
          </label>
          <input
            type="search"
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setCustomerId("");
              setVehicleMode("none");
            }}
            autoComplete="off"
            placeholder="Search customer, unit, or plate..."
            className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] placeholder:text-[#858b98] focus:outline-none focus:ring-2 focus:ring-[#004787]"
          />

          {selected && (
            <div className="rounded-lg border border-[#b7c8e8] bg-[#eef4ff] px-3 py-2 text-sm font-semibold text-[#004787]">
              Selected: {customerLabel(selected)}
            </div>
          )}

          <div className="max-h-56 overflow-auto rounded-lg border border-[#e3e6ee] bg-white">
            {customerMatches.length > 0 ? (
              customerMatches.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    setCustomerId(customer.id);
                    setCustomerQuery(customerLabel(customer));
                    setVehicleMode("none");
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b border-[#eef0f5] px-3 py-3 text-left last:border-b-0 hover:bg-[#f1f3f9] ${
                    customer.id === customerId ? "bg-[#eef4ff]" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#191c20]">{customer.name}</span>
                    <span className="block truncate text-xs text-[#5f6673]">
                      {customer.companyName ?? `${customer.vehicles.length} vehicle${customer.vehicles.length === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#004787]">Select</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-[#5f6673]">No matching customers.</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setCustomerMode("new");
              setNewCustomerName(customerQuery.trim());
              setVehicleMode("none");
            }}
            className="w-full rounded-lg border border-dashed border-[#c2c6d3] bg-white px-3 py-3 text-left text-sm font-semibold text-[#004787] hover:bg-[#f1f3f9]"
          >
            Add new customer{customerQuery.trim() ? `: ${customerQuery.trim()}` : ""}
          </button>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-[#e3e6ee] bg-white p-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#424955]">
              Customer name <span className="text-[#d32f2f]">*</span>
            </label>
            <input
              name="newCustomerName"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              required
              placeholder="e.g. John Smith"
              className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] placeholder:text-[#858b98] focus:outline-none focus:ring-2 focus:ring-[#004787]"
            />
          </div>
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
              required={vehicleMode === "existing"}
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
