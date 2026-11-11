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
- Gaming prices appear on several pages and schema. Current published first-hour offer is £15 including four drinks, then £8 per extra hour. Older owner records say £12; reconcile before changing.
- Menu.html contains in-café highlights. Uber Eats prices and stock are a different source; never copy delivery prices into the café menu automatically.
- Parking/access: free on-site parking, step-free street-level entry, accessible parking, no accessible toilet. Private hire: £100/hour exclusive whole venue, three-hour minimum (£300), food/refreshments separate, £50 outside-food fee, no café VAT added. This existing owner-approved rate was recovered from the 30 October visibility/action-plan record. Capacity is confirmed by layout: earlier maximum60 conflicts with later platform layout figures, so do not publish a blanket capacity until reconciled. The agreed quote confirms catering, access and safe capacity.
- Movie requests require verified screening permissions and setup. Publish dated events only when confirmed.

## Open game sessions

The Games page reads `game-sessions.json`. Add a row once the café has confirmed the session and table. Each row needs `status` set to `confirmed`, a public `title`, `startsAt` in ISO 8601 format with a UTC offset or Z, `durationMinutes` as a positive whole number and `seatsOpen` as a non-negative whole number. Optional `level` and `host` strings appear on the public card. Use an agreed public host label.

Update `seatsOpen` as you confirm places. A row with zero seats shows Full. Remove cancelled sessions or set `status` to `cancelled`. Dates display in UK time, with Friday to Sunday under This weekend. Seat requests open a WhatsApp draft for the visitor to send. Host enquiries use the existing contact form.

## Leaderboards

`leaderboards.html` reads the public `leaderboards.json` feed, with separate `fc27`, `chess` and `boxing` arrays. Start empty until the café has verified entries. Use a stable `playerId`, an agreed public `displayName` of up to 60 characters, `verified` set to `true` and `verifiedAt` as an ISO 8601 timestamp including a timezone. Keep contact details out of this public file.

FC27 and Chess entries use a numeric `rating` from 1 to 4, in steps of 0.1, reviewed by café staff. The labels are Beginner below 2, Developing below 3, Skilled below 4 and Elite at 4. The latest verified rating for each player counts. Boxing entries use an integer `score` from 0 to 999, with the highest verified attempt per player counting. Equal ratings or scores share a competition rank, such as 1, 1, 3. The boards are ongoing standings. Competition dates, reset periods and prizes need owner-confirmed rules before publication.

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
- Private hire: up to 80 guests, 50% deposit to confirm, cancellations at least 24 hours before the event. The 80 figure supersedes the earlier unreconciled 60; re-check it against the venue's fire risk assessment.
- Walk-ins are welcome; booking is recommended on busy evenings.
- About page now says the café is owned and run by two friends who bought it from the previous owners. Names are not published.
- Leaderboards and My account were removed from the primary navigation (boards are empty and accounts are not open yet). Leaderboards is linked from the footer; restore both to the navigation when they launch.
