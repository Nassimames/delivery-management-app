import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  MapPinned,
  PackagePlus,
  Plus,
  Route,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { ProductImage } from "@/components/ui/product-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardMapPanel } from "@/features/dashboard/components/dashboard-map-panel";
import type { DeliveryZone } from "@/features/zones/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";

type RecentOrder = {
  id: string;
  product_id: string;
  quantity: number;
  assigned_zone_id: string;
  status: string;
  created_at: string;
};

const numberFormat = new Intl.NumberFormat("en-GB");
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function statusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "delivered") return "success";
  if (status === "cancelled") return "danger";
  if (status === "out_for_delivery" || status === "preparing") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  index,
}: {
  label: string;
  value: number | null;
  caption: string;
  icon: LucideIcon;
  index: string;
}) {
  return (
    <article className="metric-card group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-panel sm:p-6">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand/8 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
          <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-5 text-[2.5rem] font-semibold leading-none tracking-[-0.06em] text-ink tabular-nums">
        {value === null ? "—" : numberFormat.format(value)}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">{caption}</span>
        <span className="font-mono text-[10px] text-slate-300">{index}</span>
      </div>
    </article>
  );
}

export default async function HomePage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    productsCountResult,
    zonesResult,
    zonesCountResult,
    ordersCountResult,
    pendingCountResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("delivery_zones")
      .select(
        "id, user_id, name, center_latitude, center_longitude, radius_km, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("delivery_zones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id, product_id, quantity, assigned_zone_id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const zones: DeliveryZone[] = (zonesResult.data ?? []).map((zone) => ({
    ...zone,
    center_latitude: Number(zone.center_latitude),
    center_longitude: Number(zone.center_longitude),
    radius_km: Number(zone.radius_km),
  }));
  const recentOrders = (recentOrdersResult.data ?? []) as RecentOrder[];
  const productIds = [...new Set(recentOrders.map((order) => order.product_id))];
  const [productsResult, zoneOrderCounts] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("products")
          .select("id, name, image_url")
          .eq("user_id", user.id)
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(
      zones.map(async (zone) => {
        const { count, error } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("assigned_zone_id", zone.id);
        return { zone, count: count ?? 0, error };
      }),
    ),
  ]);

  const productById = new Map(
    (productsResult.data ?? []).map((product) => [product.id, product]),
  );
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const dashboardError =
    productsCountResult.error?.message ??
    zonesResult.error?.message ??
    zonesCountResult.error?.message ??
    ordersCountResult.error?.message ??
    pendingCountResult.error?.message ??
    recentOrdersResult.error?.message ??
    productsResult.error?.message ??
    zoneOrderCounts.find((entry) => entry.error)?.error?.message ??
    null;
  const maxZoneOrders = Math.max(
    ...zoneOrderCounts.map((entry) => entry.count),
    1,
  );

  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="dashboard-hero relative isolate overflow-hidden rounded-[1.65rem] bg-[#142f2c] px-6 py-7 text-white shadow-[0_20px_60px_-28px_rgba(12,39,35,.55)] sm:px-9 sm:py-9 lg:px-11 lg:py-10">
        <div aria-hidden="true" className="hero-grain absolute inset-0 -z-10" />
        <div
          aria-hidden="true"
          className="hero-orbit absolute -right-24 -top-40 -z-10 size-[28rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-4 top-0 -z-10 size-72 rounded-full bg-[#79a98c]/15 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-9 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/75">
              <span className="size-1.5 rounded-full bg-[#b8dc9b] shadow-[0_0_9px_#b8dc9b]" />
              DELIVERY OPERATIONS · OVERVIEW
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#b8dc9b]">
              Wayline / Control room
            </p>
            <h1 className="mt-3 text-[2.55rem] font-medium leading-[1.04] tracking-[-0.055em] sm:text-5xl lg:text-[3.6rem]">
              The whole network,
              <br className="hidden sm:block" /> in good hands.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/65 sm:text-base">
              A considered view of today&apos;s delivery operation, from the
              products on your shelves to the zones you serve.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/orders"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#c7e2aa] px-4 text-sm font-semibold text-[#183630] shadow-sm transition hover:bg-[#d6edbb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Plus aria-hidden="true" size={16} />
              New order
            </Link>
            <Link
              href="/zones"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-4 text-sm font-medium text-white transition hover:bg-white/[0.13] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <MapPinned aria-hidden="true" size={16} />
              Add a zone
            </Link>
          </div>
        </div>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/12 pt-4 text-xs text-white/55">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#b8dc9b]" />
            Connected workspace
          </span>
          <span className="hidden text-white/20 sm:inline">/</span>
          <span>Numbers reflect your current Supabase data</span>
        </div>
      </section>

      {dashboardError ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Some dashboard data could not be loaded: {dashboardError}
        </p>
      ) : null}

      <section
        aria-label="Workspace statistics"
        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Products"
          value={productsCountResult.error ? null : productsCountResult.count}
          caption="In your catalogue"
          icon={Boxes}
          index="01 / 04"
        />
        <MetricCard
          label="Delivery zones"
          value={zonesCountResult.error ? null : zonesCountResult.count}
          caption="Coverage areas"
          icon={MapPinned}
          index="02 / 04"
        />
        <MetricCard
          label="All orders"
          value={ordersCountResult.error ? null : ordersCountResult.count}
          caption="Across your operation"
          icon={Route}
          index="03 / 04"
        />
        <MetricCard
          label="Pending"
          value={pendingCountResult.error ? null : pendingCountResult.count}
          caption="Awaiting next step"
          icon={Clock3}
          index="04 / 04"
        />
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(360px,0.84fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-brand">
                Latest movement
              </p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
                Recent orders
              </h2>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 pb-0.5 text-xs font-semibold text-brand transition hover:text-brand-hover"
            >
              All orders <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eaf3eb] text-brand">
                <ShoppingBag aria-hidden="true" size={21} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">
                A fresh start
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-muted">
                Your orders will find a home here as soon as the first one is
                placed.
              </p>
              <Link
                href="/orders"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                Create your first order <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
                    <tr>
                      <th scope="col" className="px-6 py-3">Order</th>
                      <th scope="col" className="px-4 py-3">Zone</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-6 py-3 text-right">Placed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {recentOrders.map((order) => {
                      const product = productById.get(order.product_id);
                      return (
                        <tr key={order.id} className="group transition hover:bg-[#fafbf9]">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <ProductImage
                                src={product?.image_url ?? null}
                                alt={product?.name ?? "Product"}
                                className="size-10 rounded-lg"
                                sizes="40px"
                              />
                              <div className="min-w-0">
                                <p className="max-w-36 truncate text-[13px] font-semibold text-ink">
                                  {product?.name ?? "Deleted product"}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted">
                                  {order.quantity} {order.quantity === 1 ? "unit" : "units"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted">
                            {zoneById.get(order.assigned_zone_id)?.name ?? "Deleted zone"}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge tone={statusTone(order.status)}>
                              {statusLabel(order.status)}
                            </StatusBadge>
                          </td>
                          <td className="whitespace-nowrap px-6 py-3.5 text-right font-mono text-[10px] text-muted">
                            {dateFormat.format(new Date(order.created_at))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border sm:hidden">
                {recentOrders.map((order) => {
                  const product = productById.get(order.product_id);
                  return (
                    <li key={order.id} className="flex items-center gap-3 px-4 py-3.5">
                      <ProductImage
                        src={product?.image_url ?? null}
                        alt={product?.name ?? "Product"}
                        className="size-11 rounded-lg"
                        sizes="44px"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {product?.name ?? "Deleted product"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {zoneById.get(order.assigned_zone_id)?.name ?? "Deleted zone"} ·{" "}
                          {dateFormat.format(new Date(order.created_at))}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone(order.status)}>
                        {statusLabel(order.status)}
                      </StatusBadge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-card">
          <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-brand">
                Network distribution
              </p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
                Orders by zone
              </h2>
            </div>
            <MapPinned aria-hidden="true" size={17} className="mb-1 text-muted/70" />
          </div>
          {zones.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No zones to chart</p>
              <p className="mt-1 text-sm text-muted">
                Add a coverage area to start mapping your network.
              </p>
              <Link
                href="/zones"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover"
              >
                Set up a delivery zone <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>
          ) : (
            <div className="space-y-5 px-5 py-6 sm:px-6">
              {[...zoneOrderCounts]
                .sort(
                  (a, b) =>
                    b.count - a.count || a.zone.name.localeCompare(b.zone.name),
                )
                .slice(0, 6)
                .map(({ zone, count }, index) => (
                  <div key={zone.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] ${
                            index === 0
                              ? "bg-[#eaf3eb] text-brand"
                              : "bg-slate-100 text-muted"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-medium text-ink">
                          {zone.name}
                        </span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted">
                        {numberFormat.format(count)}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${zone.name} orders`}
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={maxZoneOrders}
                      className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          index === 0 ? "bg-brand" : "bg-[#84a998]"
                        }`}
                        style={{
                          width: `${count === 0 ? 0 : Math.max(4, (count / maxZoneOrders) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              <p className="border-t border-border pt-4 text-[11px] leading-5 text-muted">
                Counts are calculated from your complete order history.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-brand">
              Geographic footprint
            </p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
              Coverage at a glance
            </h2>
          </div>
          <Link
            href="/zones"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition hover:text-brand-hover"
          >
            Manage coverage <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
        {zones.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eaf3eb] text-brand">
              <MapPinned aria-hidden="true" size={22} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink">
              Your map starts here
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-muted">
              Create delivery zones to see your real service footprint on the
              map.
            </p>
            <Link
              href="/zones"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              <Plus aria-hidden="true" size={15} /> Create a zone
            </Link>
          </div>
        ) : (
          <DashboardMapPanel zones={zones} />
        )}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/products"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-panel"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#f0eee7] text-[#87744c] transition group-hover:bg-[#e9e3d3]">
            <PackagePlus aria-hidden="true" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Add a product</span>
            <span className="mt-0.5 block text-xs text-muted">Keep the catalogue current</span>
          </span>
          <ArrowUpRight aria-hidden="true" size={16} className="text-muted transition group-hover:text-brand" />
        </Link>
        <Link
          href="/zones"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-panel"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#eaf3eb] text-brand transition group-hover:bg-[#dcebdd]">
            <MapPinned aria-hidden="true" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Shape a zone</span>
            <span className="mt-0.5 block text-xs text-muted">Extend your service area</span>
          </span>
          <ArrowUpRight aria-hidden="true" size={16} className="text-muted transition group-hover:text-brand" />
        </Link>
        <Link
          href="/orders"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-panel"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-[#f5eae5] text-[#a75e41] transition group-hover:bg-[#efded5]">
            <ShoppingBag aria-hidden="true" size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Create an order</span>
            <span className="mt-0.5 block text-xs text-muted">Check coverage and stock</span>
          </span>
          <ArrowDownRight aria-hidden="true" size={16} className="text-muted transition group-hover:text-brand" />
        </Link>
      </section>
    </div>
  );
}
