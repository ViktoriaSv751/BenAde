# BenAde – Tachográf Emlékeztető

Next.js 15 + Supabase (fiókok, adatbázis, realtime) + Vercel, natív iOS/Android burok Capacitorral.

## Futtatás
1. `.env.example` → `.env.local`, Supabase URL és anon kulcs kitöltése.
2. `supabase/schema.sql` lefuttatása a Supabase SQL-szerkesztőjében.
3. Supabase → Authentication → URL Configuration: Site URL = a Vercel-domain, Redirect URL-ek: `https://<domain>/auth/callback`, `hu.benade.app://*`.
4. `npm install && npm run dev`.

## Natív appok
- `npx cap sync` – a webes URL-t a `capacitor.config.ts` `server.url` mezője adja (éles domain).
- `npm run cap:assets` – ikon és splash generálása az `assets/` mappából.
- iOS: `npx cap open ios` (Xcode, Signing & Capabilities → saját csapat), Android: `npx cap open android`.
- Részletek: `store/LAUNCH.md`.

## Szerkezet
- `app/` – oldalak (kezdőlap, bejelentkezés, regisztráció, jelszó, `/app`, jogi oldalak)
- `src/engine/app.js` – maga az alkalmazás (Teendő, Emlékeztető, Számla, Adatbank, értesítések)
- `app/benade.css`, `app/globals.css` – dizájnrendszer
- `supabase/schema.sql` – táblák, RLS, fióktörlés, realtime
