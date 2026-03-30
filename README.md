# FuelWatch SA

A crowdsourced fuel price tracker for South African drivers. Built with React + TypeScript + Vite, deployed as a native Android/iOS app via Capacitor.

## Tech Stack

- **Frontend:** React 18, TypeScript (strict), Vite 5
- **Mobile:** Capacitor 6 (Android & iOS)
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Navigation:** React Router v6
- **Fonts:** Orbitron · Syne · DM Mono

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd FuelWatch
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Supabase Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Stations table
create table stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  address text,
  latitude float8 not null,
  longitude float8 not null,
  created_at timestamptz default now()
);

-- Price reports table
create table price_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references stations(id) on delete cascade,
  fuel_type text not null check (fuel_type in ('p93', 'p95', 'd005', 'd0005')),
  price_cents integer not null,
  reported_by uuid references auth.users(id),
  reported_at timestamptz default now(),
  verified boolean default false
);

-- Latest prices view (one row per station per fuel type — most recent)
create or replace view latest_prices as
select distinct on (station_id, fuel_type)
  station_id,
  fuel_type,
  price_cents,
  reported_at
from price_reports
order by station_id, fuel_type, reported_at desc;

-- Row Level Security
alter table stations enable row level security;
alter table price_reports enable row level security;

-- Public read access
create policy "Public read stations" on stations for select using (true);
create policy "Public read price_reports" on price_reports for select using (true);

-- Authenticated users can insert price reports
create policy "Auth users insert reports" on price_reports
  for insert with check (auth.uid() is not null or reported_by is null);

-- Seed some sample stations (optional)
insert into stations (name, brand, address, latitude, longitude) values
  ('Sandton BP N1', 'BP', 'N1 Highway, Sandton', -26.1076, 28.0567),
  ('Fourways SASOL', 'SASOL', 'Witkoppen Rd, Fourways', -26.0219, 28.0105),
  ('Randburg ENGEN', 'ENGEN', 'Republic Rd, Randburg', -26.0934, 27.9975),
  ('Midrand Total', 'TOTAL', 'Old Pretoria Rd, Midrand', -25.9987, 28.1289),
  ('Centurion Shell', 'SHELL', 'Centurion Blvd, Centurion', -25.8601, 28.1889);
```

### 4. Run in browser (dev)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Build for production

```bash
npm run build
```

---

## Capacitor — Android Build

### Prerequisites

- Android Studio installed
- Android SDK (API 33+)
- Java 17+

### Steps

```bash
# 1. Add Android platform (first time only)
npx cap add android

# 2. Build web assets + sync to native
npm run cap:sync

# 3. Open in Android Studio
npx cap open android
```

In Android Studio: **Run > Run 'app'** or build a signed APK via **Build > Generate Signed Bundle/APK**.

### Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

---

## Capacitor — iOS Build

### Prerequisites

- macOS with Xcode 15+
- Apple Developer account

### Steps

```bash
npx cap add ios
npm run cap:sync
npx cap open ios
```

In Xcode: select your team, set bundle ID to `co.za.fuelwatch`, and run on device or simulator.

---

## Project Structure

```
src/
├── components/
│   ├── AlertCard.tsx        # Alert list item
│   ├── BottomNav.tsx        # Fixed bottom navigation
│   ├── DirectionsSheet.tsx  # Bottom sheet with GMaps / Waze buttons
│   ├── FuelTabs.tsx         # Horizontal fuel type selector
│   ├── HeroCard.tsx         # Best deal hero display
│   ├── PriceBand.tsx        # Cheapest / average / priciest row
│   └── StationCard.tsx      # Station list item
├── hooks/
│   ├── useAlerts.ts         # Alert preferences & mock data
│   ├── useFuelPrices.ts     # Price stats (min/avg/max, colour fn)
│   ├── useGeolocation.ts    # Capacitor + web geolocation
│   └── useStations.ts       # Supabase fetch + realtime + sorting
├── lib/
│   ├── database.types.ts    # Supabase type definitions
│   ├── directions.ts        # GMaps / Waze deep links
│   ├── priceColors.ts       # Colour tokens + formatPrice()
│   ├── scoring.ts           # fuelScore() + priceColor()
│   └── supabase.ts          # Supabase client
├── pages/
│   ├── AlertsPage.tsx       # Notifications & preferences
│   ├── MapPage.tsx          # Station map (placeholder → TODO: Maps SDK)
│   ├── ReportPage.tsx       # Submit a price report
│   └── StationsPage.tsx     # Main station list
├── styles/
│   └── globals.css          # CSS variables, dark HUD theme
├── types/
│   └── index.ts             # Shared TypeScript types
├── App.tsx
└── main.tsx
```

## Fuel Types

| Code    | Name            | Regulated? |
|---------|-----------------|------------|
| `p93`   | Petrol 93       | ✅ DMRE    |
| `p95`   | Petrol 95       | ✅ DMRE    |
| `d005`  | Diesel 0.05%    | ❌ Market  |
| `d0005` | Diesel 0.005%   | ❌ Market  |

Petrol prices are government-regulated and identical within a zone. Diesel prices vary — **this is where crowdsourcing adds real value.**

## Scoring Algorithm

Station ranking uses a weighted score:

```
fuelScore = 0.6 × normalisedPrice + 0.4 × normalisedDistance
```

Lower score = better deal. Both price and distance are min-max normalised across all loaded stations.

## TODO / Future Work

- [ ] Google Maps SDK integration in MapPage (replace pin grid)
- [ ] Supabase Auth (anonymous or email/phone)
- [ ] Price verification voting system
- [ ] DMRE price change scraper / webhook
- [ ] Real push notifications via Capacitor + Supabase Edge Functions
- [ ] Offline caching with Capacitor Preferences
- [ ] Price history chart per station
