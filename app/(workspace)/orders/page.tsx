import { OrdersManager } from "@/features/orders/components/orders-manager";
import type { DeliveryOrder, OrderProduct } from "@/features/orders/types";
import type { DeliveryZone } from "@/features/zones/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";

export default async function OrdersPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [productsResult, zonesResult, assignmentsResult, ordersResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, image_url, price, quantity")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("delivery_zones")
        .select(
          "id, user_id, name, center_latitude, center_longitude, radius_km, created_at, updated_at",
        )
        .eq("user_id", user.id),
      supabase
        .from("product_zones")
        .select("product_id, zone_id")
        .eq("user_id", user.id),
      supabase
        .from("orders")
        .select(
          "id, product_id, quantity, customer_latitude, customer_longitude, assigned_zone_id, status, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const initialError =
    productsResult.error?.message ??
    zonesResult.error?.message ??
    assignmentsResult.error?.message ??
    ordersResult.error?.message ??
    null;

  const zones: DeliveryZone[] = (zonesResult.data ?? []).map((zone) => ({
    ...zone,
    center_latitude: Number(zone.center_latitude),
    center_longitude: Number(zone.center_longitude),
    radius_km: Number(zone.radius_km),
  }));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const zoneIdsByProduct = new Map<string, string[]>();

  for (const assignment of assignmentsResult.data ?? []) {
    const ids = zoneIdsByProduct.get(assignment.product_id) ?? [];
    ids.push(assignment.zone_id);
    zoneIdsByProduct.set(assignment.product_id, ids);
  }

  const products: OrderProduct[] = (productsResult.data ?? []).map((product) => ({
    ...product,
    price: Number(product.price),
    quantity: Number(product.quantity),
    zones: (zoneIdsByProduct.get(product.id) ?? [])
      .map((id) => zoneById.get(id))
      .filter((zone): zone is DeliveryZone => Boolean(zone)),
  }));
  const productById = new Map(products.map((product) => [product.id, product]));
  const orders: DeliveryOrder[] = (ordersResult.data ?? []).map((order) => ({
    ...order,
    quantity: Number(order.quantity),
    customer_latitude: Number(order.customer_latitude),
    customer_longitude: Number(order.customer_longitude),
    product_name: productById.get(order.product_id)?.name ?? "Deleted product",
    product_image_url: productById.get(order.product_id)?.image_url ?? null,
    zone_name: zoneById.get(order.assigned_zone_id)?.name ?? "Deleted zone",
  }));

  return (
    <OrdersManager
      products={products}
      initialOrders={orders}
      initialError={initialError}
    />
  );
}
