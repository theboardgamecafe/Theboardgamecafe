# Website maintenance

Canonical site: https://theboardgamecafe.co.uk/ · GitHub Pages publishes main.

## Homepage and booking layout

The homepage keeps the café's earlier photo hero, Playfair Display / Montserrat fonts, rounded buttons and venue sections. The calendar and two-step table planner stay embedded on the home page and on `booking.html`. `mobile-layout.css` and `mobile-layout.js` maintain compact navigation and phone spacing while `booking.css` and `booking.js` own the booking flow. Keep the planner markup in both entry points in sync.

The planner collects visit details, shows the per-table estimate and then reveals contact details after Review your plan. Edit visit details preserves the entered values. A booking request still needs the café to confirm availability. Validate both entry points after booking changes.

## Website and app together

Keep `cafe-ui.css` and `cafe-calendar.js` byte-identical with their copies in `web/` in `theboardgamecafe/the-board-game-cafe-preview`. These files own the shared colours, mobile Home / Book / Join / Menu bar, review cards and calendar. Each booking flow supplies its own date limits and availability predicate; selecting a date updates its original date input. The app still checks station availability on the server, and the public website still sends a booking request.

Mobile navigation uses the original brand header with an expandable vertical menu below 1100px and four bottom shortcuts below 900px. Keep the four bottom links and their active states consistent across the website and app. Verify the menu with a keyboard, phone widths, safe areas and the footer when editing shared navigation.

The home page includes the previously published 4.9/5 Google rating and two review excerpts. These are the fallback content. `google-reviews.js` replaces them with the live rating, review count and up to four reviews from Google Maps Platform (Maps JavaScript API, Place class) once `data-maps-key` on `#google-reviews` holds a browser key restricted to this domain and to the Maps JavaScript API and Places API (New). With no key, a blocked script or a failed lookup, the fallback stays. Google does not allow review content to be stored, so do not copy live reviews into the HTML. The home page CSP allows maps.googleapis.com and maps.gstatic.com for this; check the browser console for CSP errors after any change. Keep the reviewer name, "Google Maps" attribution and Report link on each card.

## Keep information consistent

- Hours appear in booking.html, contact.html, index.html, FAQ/structured data and booking.js (UK service-day schedule). Update all together only after owner confirmation.
- Gaming prices appear on several pages and schema. Current published price is £8 per hour per table, with drinks and food ordered separately. The owner removed the £15 first-hour offer with four drinks on 12 November 2026; do not reintroduce it.
- Menu.html contains in-café highlights. Uber Eats prices and stock are a different source; never copy delivery prices into the café menu automatically.
- Parking/access: free on-site parking, step-free street-level entry, accessible parking, no accessible toilet. Private hire: £100/hour exclusive whole venue, three-hour minimum (£300), food/refreshments separate, £50 outside-food fee, no café VAT added. This existing owner-approved rate was recovered from the 30 October visibility/action-plan record. Maximum capacity is 80 guests, the figure in the venue's fire risk assessment (owner-confirmed 12 November 2026); it replaces the earlier 60. The agreed quote confirms catering and access.
- Movie requests require verified screening permissions and setup. Publish dated events only when confirmed.

## Open game sessions

The Games page also reads the café app. `#game-calendar` carries `data-games-api` (the app's address, which must also be in that page's `connect-src`). When the app's `/api/config` reports `features.groups` as true, the page lists the open games from `/api/groups` beside any rows in `game-sessions.json`, each with a “Join this game” link that opens that game in the app, and the Host a game button goes to the app. The list is read again each minute while the page is on screen. If the app has games switched off or cannot be reached, the page keeps its enquiry wording and shows only `game-sessions.json`. Never point `data-games-api` at a test or preview service.

The Games page reads `game-sessions.json`. Add a row once the café has confirmed the session and table. Each row needs `status` set to `confirmed`, a public `title`, `startsAt` in ISO 8601 format with a UTC offset or Z, `durationMinutes` as a positive whole number and `seatsOpen` as a non-negative whole number. Optional `level` and `host` strings appear on the public card. Use an agreed public host label.

Update `seatsOpen` as you confirm places. A row with zero seats shows Full. Remove cancelled sessions or set `status` to `cancelled`. Dates display in UK time, with Friday to Sunday under This weekend. Seat requests open a WhatsApp draft for the visitor to send. Host enquiries use the existing contact form.

## Ordering from the menu page

`menu.html` has a hidden “Order to your table” button (`#order-in-app`) that `menu-order.js` shows while the café app reports `features.ordering` as true. It links to the app's ordering page. The app sells from the same menu at the same café prices (`server/cafe-menu.json` in the app's repository), so when an item or price changes, change `menu.html` and that file together. Never point `data-order-api` at a test or preview service.

## Leaderboards

`leaderboards.html` also reads the café app. `.leaderboard-grid` carries `data-boards-api` (the app's address, which must also be in that page's `connect-src`). When the app's `/api/config` reports `features.groups` as true, the page shows the app's boards from `/api/players/leaderboard` instead of `leaderboards.json`: FC 27 and Chess by skill level, and the boxing machine with a **This month** board (shown first) and an **All time** board. Text marked `data-live` is swapped for its live wording at the same time. If the app has games switched off or cannot be reached, the page reads `leaderboards.json` as described below. Never point `data-boards-api` at a test or preview service.

`leaderboards.html` reads the public `leaderboards.json` feed, with separate `fc27`, `chess` and `boxing` arrays. Start empty until the café has verified entries. Use a stable `playerId`, an agreed public `displayName` of up to 60 characters, `verified` set to `true` and `verifiedAt` as an ISO 8601 timestamp including a timezone. Keep contact details out of this public file.

FC 27 and Chess entries use a numeric `rating` from 1 to 4, in steps of 0.1, reviewed by café staff. The labels are Beginner below 2, Developing below 3, Skilled below 4 and Elite at 4. The latest verified rating for each player counts. Boxing entries use an integer `score` from 0 to 999, with the highest verified attempt per player counting. Equal ratings or scores share a competition rank, such as 1, 1, 3. The boards are ongoing standings. Competition dates, reset periods and prizes need owner-confirmed rules before publication.

## Forms and privacy

booking.js and enquiry.js send to the existing Web3Forms account. A successful HTTP response must contain success:true. Test failures as well as success; keep test messages clearly labelled and verify actual inbox delivery separately. Do not place a booking/payment during QA.

site.js emits local dataLayer/custom events. The optional statistics.js collector counts only consented allowlisted page/action events, without form text or contact details. Thank-you events require a recent one-use session receipt, and success counts require a validated successful form response. Google Analytics is not connected; do not claim Google attribution, unique visitors or field Core Web Vitals from the aggregate counters.

The CSP allows same-origin scripts only. Keep code in external scripts and update cache version strings with asset changes. No cookies for ads/analytics currently load; disclose new providers before deployment.

## Before publishing

Check links/fragments, heading structure, JSON-LD and matching visible information. Exercise closed Tuesdays, UK midnight slots, invalid form, failure/retry/confirmed response, mobile menu and keyboard focus. Check390/768/1440px and zoom with real installed browsers; source checks are not a substitute for devices. Verify live pages and inbox routing after successful Pages deployment.

## Account-level items

Enable Enforce HTTPS in GitHub Pages if HTTP still serves the site. Registrar forwarding should preserve paths from the old domain. Search Console, analytics account/property, current complete menu, reconciled hours/offer and game inventory remain owner inputs.


## Completion pass, 4 November 2026

Optional aggregate statistics: statistics.js/statistics.css; disabled until explicit opt-in, no visitor IDs or form values; DNT/GPC respected. Endpoint is the existing H&V website-service /api/statistics with fixed origin/page/event allowlists. Coordinate new page paths with the service allowlist. Keep policy wording and consent controls in sync. 

Protected operational console: https://hollin-and-vale-enquiries.r9shbntmg2.chatgpt.site/admin — owner ChatGPT sign-in required; no public records. It shows H&V enquiries and statistics for both websites, excludes QA by default and does not send email notifications. SITE_ADMIN_EMAIL stays secret in hosting runtime. Existing enquiry API and CORS are unchanged.

Fonts now use exact self-hosted approved WOFF2 files in assets/fonts with OFL licences and critical preloads; preserve their declared weights. The Google rating on the homepage is maintained manually. Keep the review link alongside it.


## Owner-confirmed updates, 11 November 2026

Confirmed by the owner on 11 November 2026 and published across the site:

- Tuesdays are still closed. The owner plans to open for Champions League match nights shortly; the site says "coming soon" until a start date and opening time are confirmed. Update hours, booking.js and the live sport page together when it starts.
- All food served is halal (home, menu, desserts, FAQ, party pages, private hire, llms.txt, homepage schema).
- Birthday, group and off-site games-hire bookings are advertised "from £50 an hour".
- Private hire: up to 80 guests, 50% deposit to confirm, cancellations at least 24 hours before the event. The 80 figure is the fire-risk-assessed capacity, confirmed by the owner on 12 November 2026.
- Walk-ins are welcome; booking is recommended on busy evenings.
- About page now says the café is owned and run by two friends who bought it from the previous owners. Names are not published.
- Leaderboards and My account were removed from the primary navigation (boards are empty and accounts are not open yet). Leaderboards is linked from the footer; restore both to the navigation when they launch.

## Instant table bookings (on)

The booking form on `index.html` and `booking.html` confirms tables straight away. `data-booking-api` on `#booking-form` holds the address of the live booking server (`theboardgamecafe/the-board-game-cafe-preview`, running in its `venue` mode on Render with a persistent disk): `https://app.theboardgamecafe.co.uk`. That address is a GoDaddy `CNAME` record (`app`) pointing at the Render service, which also still answers at `https://the-board-game-cafe-preview.onrender.com`.

- The planner asks the server for free tables (`/api/availability`), shows the total, and books with `POST /api/bookings` and `payment: "venue"` (pay at the café). Guests get an on-page confirmation with their reference, a calendar file and a private link to view or cancel the booking.
- Each instant booking still sends the usual Web3Forms email to the café, with "CONFIRMED" and the booking reference in the subject. Staff manage bookings in the server's staff dashboard (`/staff`), which is the one diary for online bookings, walk-in holds and cancellations.
- A "Pay now" button appears only when the server reports that card payments are on (`features.prepay` in `/api/config`). It holds the table, sends the guest to Stripe's payment page, and Stripe returns them to their booking in the app (`app.theboardgamecafe.co.uk`). The server emails the guest and the café once the payment is in, and handles cancellations and refunds; the website only forwards a guest's note, marked as not confirmed yet.
- If the server cannot be reached when the page loads, the form falls back to the old booking request (Web3Forms email, then `booking-thanks.html`), so the static wording in the HTML still describes a request. `booking.js` swaps in the instant-booking wording once the server answers.
- Bigger groups (five or more), parties and private hire stay as enquiries.

If the server moves to another address: change `data-booking-api` in both pages, change the same address in `connect-src` in both pages' Content-Security-Policy, make sure the server's `CAFE_WEB_ORIGINS` includes `https://theboardgamecafe.co.uk,https://www.theboardgamecafe.co.uk`, and bump the `booking.js` cache version. To switch instant bookings off, empty `data-booking-api` in both pages. Never point the live site at a server without persistent storage: its bookings would be lost on a restart.
