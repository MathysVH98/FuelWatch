-- ─────────────────────────────────────────────────────────────────────────────
-- DMRE / AA Fuel Prices — manual seed (fallback if Edge Function is not deployed)
-- Source: https://www.aa.co.za/fuel-price/
-- Effective: 5 March 2026
--
-- Run in Supabase SQL editor. The Edge Function will overwrite these
-- automatically once deployed and invoked.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO dmre_prices (fuel_type, zone, price_cents, effective_date)
VALUES
  -- Petrol 93 (ULP 93) — fixed retail price
  ('p93', 'inland',  2436, '2026-03-05'),
  ('p93', 'coastal', 2356, '2026-03-05'),

  -- Petrol 95 (ULP 95) — fixed retail price
  ('p95', 'inland',  2479, '2026-03-05'),
  ('p95', 'coastal', 2399, '2026-03-05'),

  -- Diesel 500ppm (0.05% sulphur) — DMRE maximum retail price
  ('d005', 'inland',  2210, '2026-03-05'),
  ('d005', 'coastal', 2153, '2026-03-05'),

  -- Diesel 50ppm (0.005% sulphur) — DMRE maximum retail price
  ('d0005', 'inland',  2254, '2026-03-05'),
  ('d0005', 'coastal', 2197, '2026-03-05')

ON CONFLICT (fuel_type, zone, effective_date)
DO UPDATE SET price_cents = EXCLUDED.price_cents;

-- Verify
SELECT fuel_type, zone,
       ROUND(price_cents::numeric / 100, 2) AS rand_per_litre,
       effective_date
FROM   dmre_prices
ORDER  BY effective_date DESC, fuel_type, zone;
