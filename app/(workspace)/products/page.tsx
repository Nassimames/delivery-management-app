import { ProductsManager } from "@/features/products/components/products-manager";
import type { Product } from "@/features/products/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { connection } from "next/server";

export default async function ProductsPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [productsResult, zonesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, user_id, name, image_url, price, quantity, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("delivery_zones")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("product_zones").select("product_id, zone_id").eq("user_id", user.id),
  ]);

  const error =
    productsResult.error?.message ??
    zonesResult.error?.message ??
    assignmentsResult.error?.message ??
    null;
  const zoneNames = new Map(
    (zonesResult.data ?? []).map((zone) => [zone.id, zone.name]),
  );
  const zoneIdsByProduct = new Map<string, string[]>();

  for (const assignment of assignmentsResult.data ?? []) {
    const current = zoneIdsByProduct.get(assignment.product_id) ?? [];
    current.push(assignment.zone_id);
    zoneIdsByProduct.set(assignment.product_id, current);
  }

  const products: Product[] = (productsResult.data ?? []).map((product) => ({
    ...product,
    price: Number(product.price),
    quantity: Number(product.quantity),
    zones: (zoneIdsByProduct.get(product.id) ?? [])
      .map((id) => ({ id, name: zoneNames.get(id) }))
      .filter((zone): zone is { id: string; name: string } => Boolean(zone.name)),
  }));

  return (
    <ProductsManager
      initialProducts={products}
      availableZones={zonesResult.data ?? []}
      initialError={error}
      userId={user.id}
    />
  );
}
