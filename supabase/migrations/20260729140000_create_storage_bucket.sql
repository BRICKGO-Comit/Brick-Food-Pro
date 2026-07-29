-- ==============================================================================
-- BRICK DEAL - STORAGE BUCKET MIGRATION
-- Creates public storage buckets ('images' and 'brick-deal-images') with complete
-- RLS policies for public viewing and authenticated image uploads.
-- ==============================================================================

-- 1. Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('images', 'images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']),
  ('brick-deal-images', 'brick-deal-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- 2. Clean up old policies to prevent conflicts
DROP POLICY IF EXISTS "Public Access to Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Image Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Image Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Image Delete" ON storage.objects;

-- 3. Policy: Public Read Access (Anyone can view and download photos)
CREATE POLICY "Public Access to Images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('images', 'brick-deal-images'));

-- 4. Policy: Authenticated Insert/Upload Access (Agents, Restos, Admins can upload photos)
CREATE POLICY "Authenticated User Image Upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('images', 'brick-deal-images'));

-- 5. Policy: Authenticated Update Access (Users can update uploaded files)
CREATE POLICY "Authenticated User Image Update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('images', 'brick-deal-images'));

-- 6. Policy: Authenticated Delete Access (Users can delete files)
CREATE POLICY "Authenticated User Image Delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('images', 'brick-deal-images'));
