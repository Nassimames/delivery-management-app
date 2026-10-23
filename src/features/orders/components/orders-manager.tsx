"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ClipboardList, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProductImage } from "@/components/ui/product-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { ZoneMapPanel } from "@/features/zones/components/zone-map-panel";
import type { DeliveryZone } from "@/features/zones/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { findNearestCoveringZone } from "../lib/geography";
import type { DeliveryOrder, OrderProduct } from "../types";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type OrdersManagerProps = {
  products: OrderProduct[];
  initialOrders: DeliveryOrder[];
  initialError: string | null;
};

const NO_ZONES: DeliveryZone[] = [];

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "out_for_delivery") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function OrdersManager({
  products: initialProducts,
  initialOrders,
  initialError,
}: OrdersManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((product) => product.id === productId);
  const eligibleZones = selectedProduct?.zones ?? NO_ZONES;
  const deliveryPreview = useMemo(
    () =>
      location
        ? findNearestCoveringZone(
            location.latitude,
            location.longitude,
            eligibleZones,
          )
        : undefined,
    [eligibleZones, location],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    const numericQuantity = Number(quantity);

    if (!selectedProduct) {
      setFormError("Select a product before creating an order.");
      return;
    }
    if (!Number.isSafeInteger(numericQuantity) || numericQuantity <= 0) {
      setFormError("Order quantity must be a positive whole number.");
      return;
    }
    if (numericQuantity > selectedProduct.quantity) {
      setFormError(
        `Only ${selectedProduct.quantity} ${selectedProduct.quantity === 1 ? "unit is" : "units are"} currently in stock.`,
      );
      return;
    }
    if (!location) {
      setFormError("Click the map to select the customer's location.");
      return;
    }
    if (eligibleZones.length === 0) {
      setFormError("This product is not assigned to any delivery zones.");
      return;
    }
    if (!deliveryPreview) {
      setFormError(
        "This address is outside every delivery zone assigned to the selected product.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("create_delivery_order", {
        p_product_id: selectedProduct.id,
        p_quantity: numericQuantity,
        p_customer_latitude: Number(location.latitude.toFixed(6)),
        p_customer_longitude: Number(location.longitude.toFixed(6)),
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (
          error.code === "PGRST202" ||
          (message.includes("create_delivery_order") &&
            (message.includes("could not find") ||
              message.includes("schema cache") ||
              message.includes("does not exist")))
        ) {
          setFormError(
            `Secure order processing is not configured in Supabase. Run supabase/create_delivery_order.sql in the SQL Editor for the same project as this app. Supabase detail: ${error.message}`,
          );
        } else if (error.code === "42501") {
          setFormError(
            "Your account cannot execute the order-creation function. In Supabase, grant EXECUTE on create_delivery_order to authenticated users.",
          );
        } else if (message.includes("stock")) {
          setFormError("There is not enough stock to fulfill this order.");
        } else if (
          message.includes("outside") ||
          message.includes("delivery zone")
        ) {
          setFormError(
            "This address is outside every eligible delivery zone for this product.",
          );
        } else {
          setFormError(`Couldn't create this order: ${error.message}`);
        }
        return;
      }

      const created = Array.isArray(data) ? data[0] : data;
      if (!created?.order_id || !created.assigned_zone_id) {
        setFormError(
          "Supabase accepted the request but returned an unexpected response. Refresh to verify the order before retrying.",
        );
        return;
      }

      const assignedZone = eligibleZones.find(
        (zone) => zone.id === created.assigned_zone_id,
      );
      const order: DeliveryOrder = {
        id: created.order_id,
        product_id: selectedProduct.id,
        quantity: numericQuantity,
        customer_latitude: Number(location.latitude.toFixed(6)),
        customer_longitude: Number(location.longitude.toFixed(6)),
        assigned_zone_id: created.assigned_zone_id,
        status: "pending",
        created_at: new Date().toISOString(),
        product_name: selectedProduct.name,
        product_image_url: selectedProduct.image_url,
        zone_name: created.assigned_zone_name ?? assignedZone?.name ?? "Delivery zone",
      };

      setOrders((current) => [order, ...current]);
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                quantity:
                  typeof created.remaining_stock === "number"
                    ? created.remaining_stock
                    : product.quantity - numericQuantity,
              }
            : product,
        ),
      );
      setSuccess(
        `Order created and assigned to ${order.zone_name}${typeof created.distance_km === "number" ? ` · ${Number(created.distance_km).toFixed(1)} km from zone center` : ""}.`,
      );
      setQuantity("1");
      setLocation(null);
    } catch {
      setFormError("Couldn't create this order. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-medium text-brand">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">
          Orders
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Create delivery orders and confirm the customer is inside a zone that
          can serve the selected product.
        </p>
      </div>

      {initialError ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Could not load orders: {initialError}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}
      {formError ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <ZoneMapPanel
          zones={eligibleZones}
          selectedLocation={location}
          onLocationSelect={(point) => {
            setLocation(point);
            setFormError("");
            setSuccess("");
          }}
          canSelectLocation
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand/8 text-brand">
                <Plus aria-hidden="true" size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Create an order
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Select the product and click the customer location.
                </p>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink">Product</legend>
              {products.length === 0 ? (
                <p className="rounded-lg border border-border bg-canvas px-3 py-3 text-xs leading-5 text-muted">
                  No products are available yet.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {products.map((product) => {
                    const selected = product.id === productId;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setProductId(product.id);
                          setFormError("");
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                          selected
                            ? "border-brand bg-brand/5 ring-2 ring-brand/10"
                            : "border-border bg-white hover:bg-canvas"
                        }`}
                      >
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          className="size-12"
                          sizes="48px"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {product.quantity} in stock · {product.zones.length}{" "}
                            {product.zones.length === 1 ? "zone" : "zones"}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-brand bg-brand"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {selected ? (
                            <span className="size-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedProduct ? (
                <p className="text-xs text-muted">
                  {selectedProduct.quantity} in stock ·{" "}
                  {eligibleZones.length} eligible{" "}
                  {eligibleZones.length === 1 ? "zone" : "zones"}
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-1.5">
              <label
                htmlFor="order-quantity"
                className="block text-sm font-medium text-ink"
              >
                Quantity
              </label>
              <input
                id="order-quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand/10"
                required
              />
            </div>

            <div className="rounded-lg border border-border bg-canvas px-3 py-2.5">
              <div className="flex items-start gap-2 text-xs leading-5 text-muted">
                <MapPin
                  aria-hidden="true"
                  size={15}
                  className="mt-0.5 shrink-0 text-brand"
                />
                <span>
                  {location
                    ? `Customer: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                    : "Click the map to choose the customer location."}
                  {deliveryPreview
                    ? ` · Covered by ${deliveryPreview.zone.name} (${deliveryPreview.distanceKm.toFixed(1)} km).`
                    : location
                      ? " · Outside eligible coverage."
                      : ""}
                </span>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="text-xs leading-5 text-muted">
                Add a product and assign at least one delivery zone before
                creating an order.
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || products.length === 0}
            >
              <Plus aria-hidden="true" size={16} />
              {submitting ? "Validating and creating..." : "Create order"}
            </Button>
            <p className="text-center text-xs leading-5 text-muted">
              Stock and delivery coverage are verified securely before an order
              is saved.
            </p>
          </form>
        </Card>
      </div>

      <Card className="mt-7">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand/8 text-brand">
              <ClipboardList aria-hidden="true" size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
              <p className="mt-0.5 text-xs text-muted">
                Orders created in your workspace.
              </p>
            </div>
          </div>
        </CardHeader>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-ink">No orders yet</p>
            <p className="mt-1 text-sm text-muted">
              Successfully created orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Product</th>
                  <th scope="col" className="px-5 py-3.5">Quantity</th>
                  <th scope="col" className="px-5 py-3.5">Assigned zone</th>
                  <th scope="col" className="px-5 py-3.5">Status</th>
                  <th scope="col" className="px-5 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-ink">
                      <span className="flex items-center gap-3">
                        <ProductImage
                          src={order.product_image_url}
                          alt={order.product_name}
                          className="size-9 rounded-lg"
                          sizes="36px"
                        />
                        {order.product_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-ink">
                      {order.quantity}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink">
                      {order.zone_name}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={statusTone(order.status)}>
                        {statusLabel(order.status)}
                      </StatusBadge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
