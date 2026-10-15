# BenAde – Tachográf Emlékeztető

Next.js 15 + Supabase (fiókok, adatbázis, realtime) + Vercel, natív iOS/Android burok Capacitorral.

## Futtatás
1. `.env.example` → `.env.local`, Supabase URL és anon kulcs kitöltése.
2. `supabase/schema_v2.sql` lefuttatása a Supabase SQL-szerkesztőjében (a v1 `schema.sql` már nem használt).
3. Supabase → Authentication → URL Configuration: Site URL = a Vercel-domain, Redirect URL-ek: `https://<domain>/auth/callback`, `hu.benade.app://*`.
4. `npm install && npm run dev`.

## Natív appok
- `npx cap sync` – a webes URL-t a `capacitor.config.ts` `server.url` mezője adja (éles domain).
- `npm run cap:assets` – ikon és splash generálása az `assets/` mappából.
- iOS: `npx cap open ios` (Xcode, Signing & Capabilities → saját csapat), Android: `npx cap open android`.
- Részletek: `store/LAUNCH.md`.

## Szerkezet
- `app/` – oldalak (kezdőlap, bejelentkezés, regisztráció, jelszó, `/app`, jogi oldalak)
- `components/app/` – az alkalmazás (Ma, Naptár, Ügyfelek, Számlák, Rögzítés, Értesítések, Csapat, Beállítások, Import)
- `lib/repo.ts` – adatréteg (Supabase + demo), `lib/layout.ts` – telefon/tablet/asztali elrendezés
- `app/globals.css` – dizájnrendszer (nappali + éjszakai tokenek)
- `app/api/` – ICS-feed, PDF, értesítésküldő (cron), meghívó
- `supabase/schema_v2.sql` – munkaterületek, RLS, sorozatok, értesítési sor, napló, cron
- `store/SETUP.md` – üzembe helyezés (kulcsok), `store/LAUNCH.md` – áruházi beküldés
