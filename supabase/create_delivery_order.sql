-- Install the secure order-creation RPC for the existing delivery schema.
-- This function creates no tables and accepts no client-supplied user ID.

CREATE OR REPLACE FUNCTION public.create_delivery_order(
  p_product_id uuid,
  p_quantity integer,
  p_customer_latitude numeric,
  p_customer_longitude numeric
)
RETURNS TABLE (
  order_id uuid,
  assigned_zone_id uuid,
  assigned_zone_name text,
  distance_km double precision,
  remaining_stock integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_stock integer;
  v_zone_id uuid;
  v_zone_name text;
  v_distance_km double precision;
  v_order_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'Authentication is required to create an order.';
  END IF;

  IF p_product_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A product is required.';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Order quantity must be a positive integer.';
  END IF;

  IF p_customer_latitude IS NULL
     OR p_customer_latitude NOT BETWEEN -90 AND 90
     OR p_customer_longitude IS NULL
     OR p_customer_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Customer coordinates are invalid.';
  END IF;

  -- Serializes orders against this product so concurrent requests cannot
  -- oversell inventory.
  SELECT p.quantity
    INTO v_stock
    FROM public.products AS p
   WHERE p.id = p_product_id
     AND p.user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Product not found.';
  END IF;

  IF v_stock < p_quantity THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Insufficient stock.';
  END IF;

  -- Haversine distance in kilometers; zone UUID provides a stable tie-break.
  SELECT z.id, z.name, distance.km
    INTO v_zone_id, v_zone_name, v_distance_km
    FROM public.product_zones AS pz
    JOIN public.delivery_zones AS z
      ON z.id = pz.zone_id
     AND z.user_id = v_user_id
    CROSS JOIN LATERAL (
      SELECT
        2.0 * 6371.0088 * pg_catalog.asin(
          pg_catalog.sqrt(
            LEAST(
              1.0::double precision,
              GREATEST(
                0.0::double precision,
                pg_catalog.sin(pg_catalog.radians(
                  (z.center_latitude::double precision
                    - p_customer_latitude::double precision) / 2.0
                )) ^ 2
                + pg_catalog.cos(
                    pg_catalog.radians(p_customer_latitude::double precision)
                  )
                  * pg_catalog.cos(
                    pg_catalog.radians(z.center_latitude::double precision)
                  )
                  * pg_catalog.sin(pg_catalog.radians(
                      (z.center_longitude::double precision
                        - p_customer_longitude::double precision) / 2.0
                    )) ^ 2
              )
            )
          )
        ) AS km
    ) AS distance
   WHERE pz.product_id = p_product_id
     AND pz.user_id = v_user_id
     AND distance.km <= z.radius_km::double precision
   ORDER BY distance.km ASC, z.id ASC
   LIMIT 1
   FOR SHARE OF pz, z;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'The customer location is outside all eligible delivery zones.';
  END IF;

  UPDATE public.products AS p
     SET quantity = p.quantity - p_quantity
   WHERE p.id = p_product_id
     AND p.user_id = v_user_id
     AND p.quantity >= p_quantity
   RETURNING p.quantity INTO v_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Insufficient stock.';
  END IF;

  INSERT INTO public.orders (
    user_id,
    product_id,
    quantity,
    customer_latitude,
    customer_longitude,
    assigned_zone_id,
    status
  )
  VALUES (
    v_user_id,
    p_product_id,
    p_quantity,
    p_customer_latitude,
    p_customer_longitude,
    v_zone_id,
    'pending'
  )
  RETURNING id INTO v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_zone_id, v_zone_name, v_distance_km, v_stock;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_delivery_order(uuid, integer, numeric, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_order(uuid, integer, numeric, numeric)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
