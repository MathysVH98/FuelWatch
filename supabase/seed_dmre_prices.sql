-- ─────────────────────────────────────────────────────────────────────────────
-- DMRE Fuel Prices — effective 1 April 2026
-- Source: DMRE official statement + BusinessTech + TopAuto
-- Run in Supabase SQL editor to update all prices.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO dmre_prices (fuel_type, zone, price_cents, effective_date)
VALUES
  -- Petrol 93 ULP
  ('p93', 'inland',  2325, '2026-04-01'),
  ('p93', 'coastal', 2246, '2026-04-01'),

  -- Petrol 95 ULP
  ('p95', 'inland',  2336, '2026-04-01'),
  ('p95', 'coastal', 2253, '2026-04-01'),

  -- Diesel 500ppm (0.05% sulphur)
  ('d005', 'inland',  2590, '2026-04-01'),
  ('d005', 'coastal', 2507, '2026-04-01'),

  -- Diesel 50ppm (0.005% sulphur)
  ('d0005', 'inland',  2611, '2026-04-01'),
  ('d0005', 'coastal', 2535, '2026-04-01')

ON CONFLICT (fuel_type, zone, effective_date)
DO UPDATE SET price_cents = EXCLUDED.price_cents;

-- Verify
SELECT fuel_type, zone,
       ROUND(price_cents::numeric / 100, 2) AS rand_per_litre,
       effective_date
FROM   dmre_prices
ORDER  BY effective_date DESC, fuel_type, zone;
