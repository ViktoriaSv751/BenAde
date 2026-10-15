# BenAde 2.0 – üzembe helyezés

Minden be van kötve, külső kulcs nélkül is teljes értékűen működik:

- **Adatbázis, fiókok, realtime** – Supabase projekt `BenAde` (séma: `supabase/schema_v2.sql`).
- **Értesítésküldő** – Supabase Edge Function `notify-send`, a `pg_cron` percenként hívja. A web push (VAPID) kulcsai a `private.app_config` táblában vannak; a függvény a Supabase saját service-kulcsával fut, így a Vercelbe nem kell titkot beírni.
- **ICS naptár-feed, PDF, meghívó** – a webappból, bejelentkezéssel.

## Opcionális: e-mail értesítés (Resend)

1. resend.com → API Keys → új kulcs (ingyenes csomag elég).
2. Supabase → Edge Functions → Secrets: `RESEND_API_KEY` = a kulcs, `EMAIL_FROM` = `BenAde <ertesites@<igazolt domain>>` (domain nélkül: `BenAde <onboarding@resend.dev>`, ez csak a saját címedre küld).
3. Ettől a pillanattól az e-mail csatorna is megy – újratelepítés nem kell.

A meghívó e-mail (Csapat → meghívás) a Vercel oldalon megy: ugyanazt a `RESEND_API_KEY` + `EMAIL_FROM` párost a Vercel → Settings → Environment Variables alá is vedd fel, majd Redeploy. Enélkül a meghívó linket az app kiírja, és kézzel elküldhető.

## Opcionális: natív push (iOS/Android app)

Firebase projekt → Cloud Messaging → szerverkulcs → Supabase Edge Functions Secrets: `FCM_SERVER_KEY`. Az iOS-hez az APNs kulcsot a Firebase-ben kell feltölteni. A webes push ettől függetlenül már működik (telefonon is, ha a kezdőképernyőre teszed az oldalt).

## Ellenőrzés

- Supabase → SQL: `select status, count(*) from notifications group by 1;` – a `sent` nő, ha esedékes tétel volt.
- Supabase → Edge Functions → notify-send → Logs: percenként `POST | 200`.
- Appban: Értesítések → „Push ezen az eszközön” → Bekapcsolás (telefonon a kezdőképernyőre tett oldalon is).

## Saját domain esetén

Vercel domain + Supabase Auth Site URL/Redirect + `NEXT_PUBLIC_SITE_URL` + `capacitor.config.ts` `server.url` + a `notify-send` `SITE_URL` secretje.
