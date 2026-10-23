-- Product image support for the existing delivery-management schema.
-- This does not recreate application tables. Existing products may keep a NULL
-- image_url; new product inserts require an owned public Storage URL.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;

CREATE OR REPLACE FUNCTION public.validate_product_image_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    IF NEW.image_url IS NULL
       OR NEW.image_url !~* (
         '^https://[^/]+/storage/v1/object/public/product-images/'
         || NEW.user_id::text
         || '/[^?]+\.(jpg|jpeg|png|webp)(\?.*)?$'
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'A valid product image from your product-images Storage folder is required.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_product_image_url()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS products_validate_image_url ON public.products;
CREATE TRIGGER products_validate_image_url
  BEFORE INSERT OR UPDATE OF image_url ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_image_url();

-- The bucket was checked before creating this script and was not present.
-- ON CONFLICT keeps this safe to re-run without changing an existing bucket.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'product-images',
  'product-images',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Product images are publicly viewable"
  ON storage.objects;
CREATE POLICY "Product images are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users upload their own product images"
  ON storage.objects;
CREATE POLICY "Users upload their own product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users update their own product images"
  ON storage.objects;
CREATE POLICY "Users update their own product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users delete their own product images"
  ON storage.objects;
CREATE POLICY "Users delete their own product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
