# Medad-X SEO plan

The technical foundation is now in place: 60 crawlable URLs in English and Arabic, structured data, a share image for every page, fast pages and a sitemap. This plan covers what to do from launch onwards.

## 1. Launch week (technical)

| Task                                                           | Owner     | Notes                                                                                                                      |
| -------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Point `medadx.com` + `www` at Vercel; confirm `www` → apex 308 | Dev       | DNS: A `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`                                                                 |
| Google Search Console — Domain property (DNS TXT)              | Marketing | Submit `https://medadx.com/sitemap-index.xml`                                                                              |
| Request indexing for key URLs                                  | Marketing | `/`, `/ar`, `/products`, 3 product pages (EN+AR), `/recipes`, `/history-of-rice`, `/contact`                               |
| Bing Webmaster Tools (import from GSC) + IndexNow              | Marketing | Bing also powers ChatGPT search and Copilot                                                                                |
| Rich Results Test                                              | Dev       | A recipe (Recipe), a product (Product — "offers" warning is expected), history (Article)                                   |
| Share-preview checks                                           | Marketing | Facebook Sharing Debugger ("Scrape again"), LinkedIn Post Inspector, WhatsApp (append `?v=2` the first time), X draft post |
| Enable Vercel Web Analytics + Speed Insights                   | Dev       | Cookieless and first-party; then add one line naming it in the privacy policy                                              |

## 2. Local & entity SEO (first month)

- **Google Business Profile**:
  - Name: "Medad-X". Address: Port Gate Building, Khalidiya Junubiya, Dammam.
  - Categories: "Rice wholesaler" (primary) and "Food products supplier".
  - Bilingual description, hours (Sun–Thu 8–5) and phone +966 920009050.
  - Website: `https://medadx.com/?utm_source=gbp`.
  - Add product posts for Farah, Khayber Gate and Dhoqan, and real photos (warehouse, bags, team).
- **Identical name, address and phone** everywhere: website, Business Profile, LinkedIn, Asharqia Chamber, Saudi directories (Daleel, SaudiYP), Arsan Global Group site, Bing Places, Apple Business Connect.
- Ask HORECA clients for Google reviews. Reply to every review in the reviewer's language.
- Confirm the social profiles in `src/data/site.ts` exist (they feed `sameAs` in the structured data).

## 3. Keyword map (one primary target per page)

Before committing, check volumes for Saudi Arabia and the GCC in Search Console after 4–6 weeks, or in Google Keyword Planner / Semrush.

| Page                | EN primary                                                 | AR primary                   |
| ------------------- | ---------------------------------------------------------- | ---------------------------- |
| `/`                 | basmati rice supplier Saudi Arabia                         | مورد أرز بسمتي في السعودية   |
| `/products`         | sella basmati rice types / wholesale basmati KSA           | أرز بسمتي بالجملة            |
| `/products/farah`   | golden sella basmati 40kg                                  | أرز بسمتي سيلا ذهبي          |
| `/products/khayber` | creamy sella basmati rice                                  | أرز سيلا كريمي               |
| `/products/dhoqan`  | steam basmati rice wholesale                               | أرز بسمتي ستيم بالجملة       |
| `/contact`          | basmati rice quote / bulk rice price KSA                   | عرض سعر أرز بالجملة          |
| `/trading-account`  | rice wholesale account HORECA                              | حساب تجاري توريد أرز للمطاعم |
| `/recipes/*`        | "[dish] recipe" (chicken kabsa recipe, mandi rice recipe…) | — (EN only for now)          |
| `/history-of-rice`  | history of rice                                            | تاريخ الأرز                  |

## 4. Content plan (2 pieces a month, EN + AR)

Add a `guides` content collection at `/guides/<slug>`, using the same pattern as recipes so each guide gets its own share image and Article structured data.

1. Golden sella vs creamy sella vs steam basmati — which for which dish (link to all 3 products)
2. Basmati grain-length grades explained (8.3 mm+)
3. How much rice per cover? A HORECA planning guide (link to the order estimator)
4. Why aged basmati cooks better
5. Storing bulk rice in GCC heat and humidity
6. Best rice for kabsa, mandi and biryani (Arabic-first)
7. Translate the top 5 recipes to Arabic (`/ar/recipes/<slug>`). The routing is already designed for this; it needs translated copy only.

## 5. Internal linking (already built — keep it up)

- Recipe → "Cook it with" product → product page "Best for these dishes" → recipes
- Product cards → product pages; footer Products column; breadcrumbs on every inner page
- The home page recipe teaser and HORECA section link to recipes

## 6. Off-site authority

- Link from the Arsan Global Group website, plus Saudi Food Show and Gulfood exhibitor pages
- Chamber and trade directory listings (Kompass; avoid low-quality B2B link farms)
- Offer the History of Rice article to education and food sites. It is CC BY-SA, which makes reuse with attribution easy.

## 7. Measurement (monthly)

- Search Console: clicks and impressions by page and by country (SA, AE, KW, QA), split by `/ar` vs EN
- Conversions (events are already wired): `quote_submit`, `trading_account_submit`, `quick_quote_submit`, `whatsapp_click`, `tel_click`
- Core Web Vitals: Speed Insights, plus the Lighthouse budgets enforced in CI (`lighthouserc.json`)
- Each quarter: refresh titles and descriptions for pages with high impressions and low click-through
