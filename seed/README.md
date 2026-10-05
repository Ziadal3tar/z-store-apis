# Z-Store Demo Seed

The seed creates a presentation-ready dataset for the storefront and admin dashboard.

## Run

From the backend directory:

```bash
node seed/seed.js
```

The script reads `MONGODB_URI` or `DBURL` from `config/.env`.

Optional:

```env
SEED_PASSWORD=YourStrongDemoPassword
ROUNDS=10
```

Default demo password when `SEED_PASSWORD` is not provided: `ZStoreDemo#2026!` (change it before sharing a deployed demo).

## Demo accounts

- Admin: `admin@zstore.demo`
- Customer: `omar@zstore.demo`
- Seller: `seller@zstore.demo`

All seeded accounts use the same `SEED_PASSWORD` value.

The seed includes:

- 8 product categories
- 14 subcategories
- 10 brands
- 25 catalog products
- 1 seller storefront
- demo customers
- realistic order history with multiple statuses
- active coupons
- carts + abandoned cart example
- demo wishlist + flash-sale products
- recent 7-day activity for the admin analytics chart
- product reviews
- notifications
- newsletter subscription
- seller chat example

The script is idempotent for the main seeded records and can be run again to refresh the demo state.


## Recommended demo flow

1. Sign in as `admin@zstore.demo` to showcase the admin dashboard and analytics.
2. Sign in as `omar@zstore.demo` to showcase cart, wishlist, notifications, orders and reviews.
3. Open the seeded `Nora Studio` store to showcase the seller experience.

The seed is designed to be re-runnable without duplicating the main demo records.
