# El Pela 360 Viewer

Next.js version of the Playa Brava Jose Ignacio 360 lot viewer, ready to deploy on Vercel.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:3000`.

## Admin mode

Open `http://127.0.0.1:3000/?admin=1` to draw and manage lot polygons.

- `Start drawing`: click the panorama to add polygon points
- `Save lot`: keeps the current lot in the browser draft
- `Publish locally`: makes the saved lots visible in normal public mode in the same browser
- `Download JSON`: exports the lot dataset so you can commit it into `public/data/playa-brava-jose-ignacio-lots.json`
- `Import JSON`: restores a previous export into the admin editor

To see the customer view, open `http://127.0.0.1:3000/` without `?admin=1`. Clicking a published lot opens its detail card.

## Vercel note

This MVP has no backend. On Vercel:

- the site deploys normally
- the bundled public dataset comes from `public/data/playa-brava-jose-ignacio-lots.json`
- `Publish locally` still only updates browser storage for the browser you used

If you want admin edits to become public for every visitor on Vercel, the next step is adding real storage such as Vercel Blob, KV, Postgres, or another backend.

## Files

- `app/layout.js`: Next.js root layout and metadata
- `app/page.js`: viewer markup shell
- `app/globals.css`: layout and overlay styling
- `public/viewer.js`: WebGL panorama viewer logic
- `public/data/playa-brava-jose-ignacio-lots.json`: public lot polygons and lot metadata
- `public/panoramas/playa-brava-jose-ignacio/`: active panorama assets
