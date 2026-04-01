-- ─────────────────────────────────────────────────────────────────────────────
-- DMRE Regulated Fuel Prices — seed / update script
-- Run this in your Supabase SQL editor whenever DMRE announces new prices.
-- Source: https://www.energy.gov.za/petroleum/fuel-prices/retail-motor-fuel-price
--
-- Prices are in CENTS per litre (e.g. R24.36 → 2436)
-- effective_date = first day the prices are in effect (YYYY-MM-DD)
-- ─────────────────────────────────────────────────────────────────────────────

-- Update this date to the current announcement date before running
\set effective '2026-03-05'

INSERT INTO dmre_prices (fuel_type, zone, price_cents, effective_date)
VALUES
  -- ── Petrol 93 (ULP 93) ──────────────────────────────────────────────────────
  ('p93', 'inland',  2436, :'effective'),
  ('p93', 'coastal', 2356, :'effective'),

  -- ── Petrol 95 (ULP 95) ──────────────────────────────────────────────────────
  ('p95', 'inland',  2479, :'effective'),
  ('p95', 'coastal', 2399, :'effective'),

  -- ── Diesel 500ppm (0.05% sulphur) — DMRE maximum wholesale price ─────────────
  ('d005', 'inland',  2210, :'effective'),
  ('d005', 'coastal', 2153, :'effective'),

  -- ── Diesel 50ppm (0.005% sulphur) — DMRE maximum wholesale price ─────────────
  ('d0005', 'inland',  2254, :'effective'),
  ('d0005', 'coastal', 2197, :'effective')

ON CONFLICT (fuel_type, zone, effective_date)
DO UPDATE SET price_cents = EXCLUDED.price_cents;

-- Verify
SELECT fuel_type, zone, price_cents,
       ROUND(price_cents::numeric / 100, 2) AS rand_per_litre,
       effective_date
FROM   dmre_prices
ORDER  BY effective_date DESC, zone, fuel_type;
