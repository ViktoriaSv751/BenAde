# BenAde 2.0 – üzembe helyezési lista (tulajdonosi lépések)

A kód, az adatbázis és a cron kész. Az alábbiak titkos kulcsok, ezeket csak Te tudod beírni.

## 1. Vercel környezeti változók

Vercel → `benade` projekt → Settings → Environment Variables → mindegyiket **Production + Preview** környezetre, majd **Redeploy**.

| Kulcs | Érték | Honnan |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` (service_role) | Supabase → Project Settings → API → *service_role* (secret) |
| `NOTIFY_SECRET` | `6cfcbce8ed293b4b17703c622d3ed841ee3de7457771eff6` | Ez már be van állítva a cron-feladatban; pontosan ezt írd be |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | a chatben küldött `benade-kulcsok.txt` fájlból | – |
| `VAPID_PRIVATE_KEY` | ugyanabból a fájlból | – |
| `VAPID_SUBJECT` | `mailto:<saját e-mail>` | – |
| `RESEND_API_KEY` | `re_…` | resend.com → API Keys (ingyenes csomag elég az indulásra) |
| `EMAIL_FROM` | `BenAde <ertesites@<saját domain>>` | Resend-ben igazolt domain; amíg nincs: `BenAde <onboarding@resend.dev>` |
| `FCM_SERVER_KEY` | (opcionális) | Firebase → Project settings → Cloud Messaging – csak a natív Android/iOS pushhoz |

A `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` már be van állítva.

## 2. Ellenőrzés

1. Redeploy után nyisd meg: `https://benade.vercel.app/api/notify/send` → `{"ok":true,"hint":…}`.
2. Az appban Beállítások → Értesítések → „Próbaértesítés küldése”. 1 percen belül push + e-mail érkezik.
3. Supabase → SQL: `select status, count(*) from notifications group by 1;` – a `sent` sorok nőnek.

## 3. Supabase (egyszeri)

- Authentication → Providers → Email: *Confirm email* maradhat bekapcsolva.
- Authentication → URL Configuration: Site URL `https://benade.vercel.app`, Redirect: `https://benade.vercel.app/**` – **kész**.
- Authentication → Attack protection: *Leaked password protection* bekapcsolása (ajánlott).
- Saját domain esetén (pl. benade.hu): Site URL + `NEXT_PUBLIC_SITE_URL` + `capacitor.config.ts` `server.url` + `setup_cron` újrafuttatása az új URL-lel.

## 4. Tesztfiók

Az ellenőrzéshez létrehoztam egy ideiglenes fiókot (`e2e-teszt@benade.test`). Ha már nem kell: Supabase → Authentication → Users → törlés.
