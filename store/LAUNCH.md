# BenAde – indulás az App Store-ba és a Google Playbe

Az app kódja kész, a web (https://benade.vercel.app) élesben fut. A natív burkok (`ios/`, `android/`) ugyanazt a webappot töltik be, natív értesítéssel, ikonnal és indítóképpel. Az áruházi feltöltés csak fejlesztői gépen, a saját fiókokkal végezhető el – ez a lista ehhez a része.

## 0. Adatok

| | |
|---|---|
| App neve | BenAde – Tachográf Emlékeztető |
| Bundle ID / package | `hu.benade.app` |
| Verzió | 1.0 (build 1) |
| Kategória | Üzlet (Business) / Hatékonyság |
| Korhatár | 4+ / Mindenki |
| Ár | Ingyenes, vásárlás nélkül |
| Web | https://benade.vercel.app |
| Adatkezelés | https://benade.vercel.app/privacy |
| Feltételek | https://benade.vercel.app/terms |
| Support e-mail | **TÖLTSD KI** (App Store Connectben kötelező) |

## 1. iOS (Mac + Xcode szükséges)

- [ ] `git clone` → `npm install` → `npx cap sync ios` → `npx cap open ios`
- [ ] Xcode → App target → Signing & Capabilities: saját Team, Bundle ID `hu.benade.app`
- [ ] Capabilities: **Push Notifications** bekapcsolása (szerveroldali push), Background Modes → Remote notifications
- [ ] Product → Archive → Distribute → App Store Connect
- [ ] App Store Connect → új app: név, elsődleges nyelv **magyar**, SKU `benade-1`
- [ ] App Privacy: lásd 3. pont
- [ ] Képernyőképek: 6,7" (1290×2796) és 6,5" (1284×2778) – 4–6 kép a `store/screenshots/` szövegei alapján
- [ ] Review notes: lásd 4. pont, **tesztfiók e-mail + jelszó megadása** (hozz létre egyet az appban)
- [ ] Beküldés

## 2. Android (Android Studio)

- [ ] `npx cap sync android` → `npx cap open android`
- [ ] Build → Generate Signed Bundle (AAB) – **új upload keystore**, a jelszót jelszókezelőbe!
- [ ] Play Console → új app → magyar nyelv, ingyenes, Business
- [ ] Adatbiztonság (Data safety): lásd 3. pont
- [ ] Tartalombesorolás kérdőív: segédprogram, nincs felhasználói tartalom
- [ ] Belső teszt → zárt teszt (14 nap, legalább 12 tesztelő, új fejlesztői fiókoknál kötelező) → éles
- [ ] Értesítések: az app futásidőben kéri a POST_NOTIFICATIONS engedélyt (Android 13+)

## 3. Adatvédelmi válaszok (mindkét áruház)

Gyűjtött adat: **e-mail-cím** (fiók), **név** (opcionális), **felhasználó által megadott üzleti adatok** (cégnevek, rendszámok, sofőrnevek, kapcsolattartó telefonszám, számlaadatok). Cél: az app működése. **Nem** használjuk követésre, hirdetésre, nem adjuk át harmadik félnek (a Supabase és a Vercel adatfeldolgozó). Titkosított átvitel (HTTPS). Fióktörlés az appból (Beállítások → Fiók végleges törlése) – ez az Apple 5.1.1(v) és a Play „fióktörlés” követelmény.

App Store címkék: *Contact Info → Email Address (linked to user, app functionality)*, *Name (linked, app functionality)*, *User Content → Other (linked, app functionality)*. Nincs Tracking.

## 4. Notes for Review (angolul, beillesztendő)

> BenAde is a deadline reminder tool for tachograph service companies in Hungary. Users register with email + password, store their client companies, drivers and vehicles, and the app calculates legal download deadlines (vehicle unit +90 days, driver card +28 days), training dates and invoice due dates, and schedules local notifications. The app is in Hungarian because it is built for the Hungarian market. Test account: **EMAIL / PASSWORD** (create one in the app before submitting). The account can be deleted inside the app under Beállítások (Settings) → "Fiók végleges törlése". No in-app purchases, no tracking.

## 5. Áruházi szövegek (magyar)

**Alcím (30):** Tachográf-határidők időben

**Promóciós szöveg (170):** Fedélzeti egység és vezetői kártya letöltések, oktatások és számlahatáridők egy időrendi listában – értesítéssel, Excel nélkül.

**Leírás:**

A BenAde a tachográf-szervizek és fuvarozók napi adminisztrációját váltja ki.

• Fedélzeti egység letöltés: a következő határidőt az app számolja (+90 nap)
• Vezetői kártya letöltés: automatikusan +28 nap
• Oktatás: kapcsolattartó, cím, időpont – értesítés a napján 06:00-kor
• Számla: fizetési határidő +30 nap, lejárt és kifizetetlen tételek pirossal
• Adatbank: cégek, hozzájuk tartozó sofőrök és rendszámok
• Teendő lista: minden tétel dátum és idő szerint, színkóddal
• Értesítések a megadott időpontban
• Felhőszinkron: telefonon, tableten és gépen ugyanaz
• Biztonsági mentés és Excel-export

Időben szólunk. Ön nyugodtan vezethet.

**Kulcsszavak (100):** tachográf,letöltés,emlékeztető,fuvarozás,sofőr,vezetői kártya,határidő,flotta,szerviz

## 6. Képernyőkép-feliratok (6 kép)

1. „Minden határidő egy listában” – Teendő képernyő
2. „+90 nap, automatikusan” – Fedélzeti egység űrlap
3. „Sofőrök és járművek cégenként” – Adatbank
4. „Számlák, amik nem maradnak el” – Számla képernyő
5. „Értesítés a megadott időpontban” – Értesítések
6. „Telefonon és gépen ugyanaz” – Beállítások / szinkron

## 7. Később (nem kell az első beküldéshez)

- Saját domain (pl. benade.hu) → `NEXT_PUBLIC_SITE_URL`, `capacitor.config.ts` `server.url`, Supabase URL-konfiguráció frissítése
- Sign in with Apple / Google (csak ha a saját e-mailes bejelentkezés mellé bevezetjük a közösségi bejelentkezést – akkor Apple-nél kötelező a Sign in with Apple)
- Push értesítés szerverről (jelenleg helyi, eszközön ütemezett értesítések – zárt app mellett is szólnak)
