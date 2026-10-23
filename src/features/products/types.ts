export type Product = {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  zones: { id: string; name: string }[];
};

export type ProductZone = {
  id: string;
  name: string;
};
