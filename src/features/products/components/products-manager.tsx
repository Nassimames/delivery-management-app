"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ui/product-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProductImageUpload, validateProductImage } from "./product-image-upload";
import type { Product, ProductZone } from "../types";

type ProductsManagerProps = {
  initialProducts: Product[];
  availableZones: ProductZone[];
  initialError: string | null;
  userId: string;
};

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) {
    return <StatusBadge tone="danger">Out of stock</StatusBadge>;
  }

  if (quantity <= 5) {
    return (
      <StatusBadge tone="warning">{`Low stock · ${quantity}`}</StatusBadge>
    );
  }

  return <StatusBadge tone="success">{`In stock · ${quantity}`}</StatusBadge>;
}

export function ProductsManager({
  initialProducts,
  availableZones,
  initialError,
  userId,
}: ProductsManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? products.filter((product) =>
          product.name.toLocaleLowerCase().includes(query),
        )
      : products;
  }, [products, search]);

  function resetForm() {
    setName("");
    setPrice("");
    setQuantity("");
    setSelectedZoneIds([]);
    setImageFile(null);
    setImageError("");
    setFieldError("");
    setFormError("");
  }

  function startCreate() {
    resetForm();
    setEditingProduct(null);
    setFormOpen(true);
  }

  function startEdit(product: Product) {
    resetForm();
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toFixed(2));
    setQuantity(String(product.quantity));
    setSelectedZoneIds(product.zones.map((zone) => zone.id));
    setFormOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError("");
    setFormError("");
    setImageError("");
    setSuccess("");

    const cleanName = name.trim();
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    const invalidFields: string[] = [];

    if (!cleanName || cleanName.length > 200) {
      invalidFields.push("Enter a product name of 1–200 characters.");
    }
    if (
      !price.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > 9999999999.99
    ) {
      invalidFields.push("Price must be a valid non-negative amount.");
    }
    if (
      !quantity.trim() ||
      !Number.isSafeInteger(numericQuantity) ||
      numericQuantity < 0 ||
      numericQuantity > 2147483647
    ) {
      invalidFields.push("Stock must be a non-negative whole number.");
    }
    if (selectedZoneIds.length === 0 && !editingProduct) {
      invalidFields.push("Assign this product to at least one delivery zone.");
    }
    if (!editingProduct && !imageFile) {
      setImageError("A product image is required.");
      invalidFields.push("Upload a product image before saving.");
    } else if (imageFile) {
      const validationError = validateProductImage(imageFile);
      if (validationError) {
        setImageError(validationError);
        invalidFields.push(validationError);
      }
    }

    if (invalidFields.length > 0) {
      setFieldError(invalidFields.join(" "));
      return;
    }

    setSubmitting(true);

    let uploadedPath: string | null = null;

    try {
      const supabase = createSupabaseBrowserClient();
      let imageUrl = editingProduct?.image_url ?? null;

      if (imageFile) {
        const extension =
          imageFile.type === "image/jpeg"
            ? "jpg"
            : imageFile.type === "image/png"
              ? "png"
              : "webp";
        uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(uploadedPath, imageFile, {
            cacheControl: "3600",
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          setImageError(`Image upload failed: ${uploadError.message}`);
          setFormError("The product was not saved because its image could not be uploaded.");
          return;
        }

        imageUrl = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadedPath).data.publicUrl;
      }

      const productPayload = {
        user_id: userId,
        name: cleanName,
        price: Number(numericPrice.toFixed(2)),
        quantity: numericQuantity,
        image_url: imageUrl,
      };

      const productQuery = editingProduct
        ? supabase
            .from("products")
            .update(productPayload)
            .eq("id", editingProduct.id)
            .eq("user_id", userId)
        : supabase.from("products").insert(productPayload);
      const { data: saved, error: productError } = await productQuery
        .select(
          "id, user_id, name, image_url, price, quantity, created_at, updated_at",
        )
        .single();

      if (productError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from("product-images")
            .remove([uploadedPath]);
          setFormError(
            cleanupError
              ? `Couldn't save this product: ${productError.message}. The unused uploaded image could not be removed: ${cleanupError.message}`
              : `Couldn't save this product: ${productError.message}`,
          );
        } else {
          setFormError(`Couldn't save this product: ${productError.message}`);
        }
        return;
      }

      if (!editingProduct) {
        const { error: assignmentError } = await supabase
          .from("product_zones")
          .insert(
            selectedZoneIds.map((zoneId) => ({
              product_id: saved.id,
              zone_id: zoneId,
              user_id: userId,
            })),
          );

        if (assignmentError) {
          const { data: deleted, error: cleanupError } = await supabase
            .from("products")
            .delete()
            .eq("id", saved.id)
            .eq("user_id", userId)
            .select("id")
            .maybeSingle();

          if (deleted && uploadedPath) {
            const { error: imageCleanupError } = await supabase.storage
              .from("product-images")
              .remove([uploadedPath]);
            setFormError(
              imageCleanupError
                ? `Zone assignment failed and the product was rolled back, but its image could not be removed: ${imageCleanupError.message}`
                : `Zone assignment failed, so the product was rolled back: ${assignmentError.message}`,
            );
          } else {
            setFormError(
              cleanupError
                ? `Zone assignment failed (${assignmentError.message}) and product rollback failed (${cleanupError.message}). The uploaded image was retained because the product may still reference it.`
                : `Zone assignment failed and the product could not be confirmed as removed. Its uploaded image was retained.`,
            );
          }
          return;
        }
      } else {
        const currentZoneIds = editingProduct.zones.map((zone) => zone.id);
        const zonesToAdd = selectedZoneIds.filter(
          (zoneId) => !currentZoneIds.includes(zoneId),
        );
        const zonesToRemove = currentZoneIds.filter(
          (zoneId) => !selectedZoneIds.includes(zoneId),
        );

        if (zonesToAdd.length > 0) {
          const { error: addError } = await supabase
            .from("product_zones")
            .insert(
              zonesToAdd.map((zoneId) => ({
                product_id: saved.id,
                zone_id: zoneId,
                user_id: userId,
              })),
            );

          if (addError) {
            setProducts((current) =>
              current.map((product) =>
                product.id === saved.id
                  ? {
                      ...product,
                      ...saved,
                      price: Number(saved.price),
                      quantity: Number(saved.quantity),
                    }
                  : product,
              ),
            );
            setFormError(
              `Product details were saved, but its new zone assignments failed: ${addError.message}`,
            );
            return;
          }
        }

        if (zonesToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from("product_zones")
            .delete()
            .eq("product_id", saved.id)
            .eq("user_id", userId)
            .in("zone_id", zonesToRemove);

          if (removeError) {
            setProducts((current) =>
              current.map((product) =>
                product.id === saved.id
                  ? {
                      ...product,
                      ...saved,
                      price: Number(saved.price),
                      quantity: Number(saved.quantity),
                    }
                  : product,
              ),
            );
            setFormError(
              `Product details were saved, but its zone assignments could not be fully updated: ${removeError.message}`,
            );
            return;
          }
        }
      }

      const savedProduct: Product = {
        ...saved,
        price: Number(saved.price),
        quantity: Number(saved.quantity),
        zones: availableZones.filter((zone) =>
          selectedZoneIds.includes(zone.id),
        ),
      };

      setProducts((current) =>
        editingProduct
          ? current.map((product) =>
              product.id === editingProduct.id ? savedProduct : product,
            )
          : [savedProduct, ...current],
      );
      setSuccess(
        `${cleanName} was ${editingProduct ? "updated" : "added"} successfully.`,
      );
      resetForm();
      setFormOpen(false);
      setEditingProduct(null);
    } catch {
      if (uploadedPath) {
        const supabase = createSupabaseBrowserClient();
        const { error: cleanupError } = await supabase.storage
          .from("product-images")
          .remove([uploadedPath]);
        setFormError(
          cleanupError
            ? `The product could not be saved, and the uploaded image could not be removed: ${cleanupError.message}`
            : "Couldn't save this product. The uploaded image was removed; check your connection and try again.",
        );
      } else {
        setFormError("Couldn't save this product. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (
      !window.confirm(
        `Delete "${product.name}"? Products referenced by an order cannot be deleted.`,
      )
    ) {
      return;
    }

    setFormError("");
    setSuccess("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        setFormError(`Couldn't delete this product: ${error.message}`);
        return;
      }
      if (!data) {
        setFormError("Product was not deleted. It may no longer be available.");
        return;
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      setSuccess(`${product.name} was deleted.`);
    } catch {
      setFormError("Couldn't delete this product. Check your connection and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">
            Products
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
            Manage your catalog, available stock, and delivery coverage.
          </p>
        </div>
        <Button
          onClick={() => {
            if (formOpen) {
              resetForm();
              setEditingProduct(null);
              setFormOpen(false);
            } else {
              startCreate();
            }
          }}
        >
          <Plus aria-hidden="true" size={17} />
          {formOpen && !editingProduct ? "Close form" : "Add product"}
        </Button>
      </div>

      {initialError ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Could not load products: {initialError}
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
      {formError && !formOpen ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {formError}
        </p>
      ) : null}

      {formOpen ? (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">
              {editingProduct ? "Edit product" : "Add a product"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {editingProduct
                ? "Update product details, image, and delivery coverage."
                : "Set its image, price, starting stock, and eligible delivery zones."}
            </p>
          </CardHeader>
          {!editingProduct && availableZones.length === 0 ? (
            <div className="p-5">
              <p className="text-sm text-muted">
                Create a delivery zone before adding a product.
              </p>
              <Link
                href="/zones"
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas"
              >
                Go to delivery zones
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSave}
              noValidate
              className="grid gap-5 p-5 sm:grid-cols-2"
            >
              <ProductImageUpload
                id="product-image"
                file={imageFile}
                currentImageUrl={editingProduct?.image_url ?? null}
                onChange={setImageFile}
                onError={setImageError}
                error={imageError}
                required={!editingProduct}
              />
              <Input
                id="product-name"
                label="Product name"
                placeholder="e.g. Office supply box"
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <Input
                id="product-price"
                label="Price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
              <Input
                id="product-quantity"
                label="Available stock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm font-medium text-ink">
                  Delivery zones
                </legend>
                <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                  {availableZones.map((zone) => (
                    <label
                      key={zone.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-canvas"
                    >
                      <input
                        type="checkbox"
                        checked={selectedZoneIds.includes(zone.id)}
                        onChange={(event) => {
                          setSelectedZoneIds((current) =>
                            event.target.checked
                              ? [...current, zone.id]
                              : current.filter((id) => id !== zone.id),
                          );
                        }}
                        className="size-4 rounded border-border accent-brand"
                      />
                      <span className="truncate">{zone.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {fieldError ? (
                <p
                  role="alert"
                  className="text-sm text-danger sm:col-span-2"
                >
                  {fieldError}
                </p>
              ) : null}
              {formError ? (
                <p
                  role="alert"
                  className="text-sm text-danger sm:col-span-2"
                >
                  {formError}
                </p>
              ) : null}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm();
                    setEditingProduct(null);
                    setFormOpen(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : editingProduct ? (
                    <Pencil aria-hidden="true" size={15} />
                  ) : (
                    <Plus aria-hidden="true" size={16} />
                  )}
                  {submitting
                    ? imageFile
                      ? "Uploading and saving..."
                      : "Saving..."
                    : editingProduct
                      ? "Save changes"
                      : "Save product"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Product catalog</h2>
            <p className="mt-1 text-xs text-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              aria-hidden="true"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-3 focus:ring-brand/10"
            />
          </div>
        </CardHeader>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-muted">
              <Package aria-hidden="true" size={21} />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-ink">
              {products.length === 0 ? "No products yet" : "No matching products"}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-5 text-muted">
              {products.length === 0
                ? "Add a product to start managing your catalog and stock."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3.5"><span className="sr-only">Image</span></th>
                    <th scope="col" className="px-5 py-3.5">Product</th>
                    <th scope="col" className="px-5 py-3.5">Price</th>
                    <th scope="col" className="px-5 py-3.5">Stock</th>
                    <th scope="col" className="px-5 py-3.5">Delivery zones</th>
                    <th scope="col" className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="w-16 px-5 py-3">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          className="size-11"
                          sizes="44px"
                        />
                      </td>
                      <td className="px-5 py-4 font-medium text-ink">{product.name}</td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums text-ink">
                        {product.price.toFixed(2)}
                      </td>
                      <td className="px-5 py-4"><StockBadge quantity={product.quantity} /></td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-sm flex-wrap gap-1.5">
                          {product.zones.map((zone) => (
                            <span key={zone.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {zone.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          className="mr-1 inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          <Pencil aria-hidden="true" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {filteredProducts.map((product) => (
                <li key={product.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductImage
                      src={product.image_url}
                      alt={product.name}
                      className="size-14"
                      sizes="56px"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ink">{product.name}</h3>
                      <p className="mt-1 text-sm tabular-nums text-muted">{product.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    aria-label={`Edit ${product.name}`}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                  >
                    <Pencil aria-hidden="true" size={15} />
                  </button>
                  <button
                      type="button"
                      onClick={() => void handleDelete(product)}
                      aria-label={`Delete ${product.name}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-danger"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </div>
                  <StockBadge quantity={product.quantity} />
                  <div className="flex flex-wrap gap-1.5">
                    {product.zones.map((zone) => (
                      <span key={zone.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        {zone.name}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
