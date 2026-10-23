# Wayline

Wayline is a delivery operations dashboard for managing products, delivery zones, and customer orders in one workspace. It is built for logistics operations rather than marketplace storefronts: staff can assign products to service areas, check whether a delivery location is covered, and track orders against available stock.

The application uses real Supabase data. Dashboard metrics and lists are not seeded with demo statistics...

## Features

- **Operations dashboard** — live product, zone, order, and pending-order counts; recent orders; order totals by zone; and a map preview of configured delivery areas.
- **Delivery zones** — create circular service zones by selecting a map center and setting a radius.
- **Products** — create and manage products, stock, prices, product images, and one or more associated delivery zones.
- **Orders** — choose a product and quantity, select a customer location on the map, and create an order only when an associated zone covers that location and sufficient stock is available. The closest eligible zone is assigned.
- **Authentication** — sign up, sign in, sign out, and access-controlled workspace routes using Supabase Auth.
- **Responsive interface** — desktop workspace sidebar and mobile navigation.

## Technology

- Next.js App Router 16 and React
- TypeScript
- Tailwind CSS 4
- Supabase Auth, PostgreSQL, and Storage (`@supabase/ssr`)
- Leaflet, React Leaflet, and OpenStreetMap tiles
- Lucide React

## Requirements

- Node.js 20.9 or later
- npm
- A Supabase project with the application's database schema and appropriate Row Level Security (RLS) policies

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

   To install exactly from the committed lockfile in a clean checkout, use `npm ci`.

2. Create `.env.local` from the example file. In PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. In `.env.local`, set the public URL and publishable key from **the Supabase project that contains your application data**:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   The app also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` for projects still using the legacy anon key. Do not commit `.env.local`, and **never** put a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Sign in or create an account. Workspace pages require an authenticated Supabase user.

## Supabase setup

The application expects the existing tables and columns for `profiles`, `products`, `delivery_zones`, `product_zones`, and `orders`. It does not create or recreate these application tables. Configure RLS so users can access only their own records; the client uses the authenticated user's session and does not use a privileged key.

In the Supabase Dashboard, configure **Authentication → URL Configuration** with:

- Site URL: `http://localhost:3000` for local development (set the production URL for deployment).
- Redirect URL: `http://localhost:3000/auth/callback`.
- Add the deployed site's `https://your-domain/auth/callback` redirect URL when deploying.

If email confirmation is enabled, users must follow the confirmation link sent by Supabase before signing in.

### Product image storage

Before creating products with images, open the Supabase **SQL Editor**, select the same project as `.env.local`, and run [`supabase/product-images.sql`](./supabase/product-images.sql). This script adds the `products.image_url` column if it is missing, configures the public `product-images` bucket with JPEG/PNG/WebP and a 3 MB limit, and restricts authenticated uploads to each user's folder. Existing products can continue to have no image; new products created through the application require an uploaded image.

### Secure order creation

Before accepting orders, run [`supabase/create_delivery_order.sql`](./supabase/create_delivery_order.sql) in the SQL Editor for the same Supabase project. It installs the `public.create_delivery_order` RPC used by the application. The function derives the user from the authenticated session, checks product ownership, stock, and coverage by a zone assigned to the product, chooses the nearest eligible zone, and writes the order while decrementing stock atomically. It creates no tables.

If the app reports that secure order processing is not configured, verify that the SQL ran successfully in the correct Supabase project and that `public.create_delivery_order` is available to the `authenticated` role. Do not replace this RPC with client-only validation: the server-side database function enforces the order and stock rules.

## Routes

| Path | Description |
| --- | --- |
| `/` | Authenticated operations dashboard |
| `/zones` | Delivery zone management |
| `/products` | Product, image, stock, and zone management |
| `/orders` | Order creation, geographic coverage validation, and order list |
| `/login` | Sign in |
| `/signup` | Create an account |

## Project layout

```text
app/
  (auth)/                 Sign-in and sign-up route group
  (workspace)/            Protected dashboard and operations routes
  auth/callback/           Supabase authentication callback
src/
  components/             Shared layout and UI components
  features/               Authentication, dashboard, zones, products, and orders
  lib/supabase/            Browser/server Supabase clients and env validation
  types/                   Shared TypeScript types
supabase/                  Setup SQL for storage and secure order RPC
```

## Checks and production

Run the available checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

To start the production server locally after building:

```bash
npm run start
```

Deploy the Next.js application with the same Supabase environment variables configured in the deployment platform. Never expose a service-role key.
