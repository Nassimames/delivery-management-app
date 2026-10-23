import type { DeliveryZone } from "@/features/zones/types";

export type OrderProduct = {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  quantity: number;
  zones: DeliveryZone[];
};

export type DeliveryOrder = {
  id: string;
  product_id: string;
  quantity: number;
  customer_latitude: number;
  customer_longitude: number;
  assigned_zone_id: string;
  status: string;
  created_at: string;
  product_name: string;
  product_image_url: string | null;
  zone_name: string;
};
