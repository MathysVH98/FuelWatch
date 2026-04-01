-- ─────────────────────────────────────────────────────────────────────────────
-- FuelWatch SA — database setup
-- Run once in Supabase SQL editor.
--
-- The stations table already has a PostGIS geography column called "location".
-- This script:
--   1. Adds a spatial index on that column
--   2. Creates a view that exposes latitude/longitude as plain numbers
--   3. Creates the stations_near_me() RPC used by the app
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Spatial index (fast radius queries)
CREATE INDEX IF NOT EXISTS idx_stations_location
  ON stations USING GIST (location);

-- 2. View — exposes lat/lng as plain floats so the fallback query works
--    without raw PostGIS syntax in the JS client
CREATE OR REPLACE VIEW stations_with_coords AS
SELECT
  id,
  name,
  brand,
  address,
  is_active,
  created_at,
  updated_at,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude
FROM stations
WHERE is_active = true;

GRANT SELECT ON stations_with_coords TO anon, authenticated;

-- 3. stations_near_me RPC
CREATE OR REPLACE FUNCTION stations_near_me(
  user_lat  double precision,
  user_lng  double precision,
  radius_m  double precision DEFAULT 15000
)
RETURNS TABLE (
  id          uuid,
  name        text,
  brand       text,
  address     text,
  latitude    double precision,
  longitude   double precision,
  distance_m  double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.id,
    s.name,
    s.brand,
    s.address,
    ST_Y(s.location::geometry)  AS latitude,
    ST_X(s.location::geometry)  AS longitude,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_m
  FROM stations s
  WHERE
    s.is_active = true
    AND s.location IS NOT NULL
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_m
    )
  ORDER BY distance_m ASC;
$$;

GRANT EXECUTE ON FUNCTION stations_near_me(double precision, double precision, double precision)
  TO anon, authenticated;
