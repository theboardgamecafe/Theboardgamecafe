# Website maintenance

Canonical site: https://theboardgamecafe.co.uk/ · GitHub Pages publishes main.

## Keep information consistent

- Hours appear in booking.html, contact.html, index.html, FAQ/structured data and booking.js (UK service-day schedule). Update all together only after owner confirmation.
- Gaming prices appear on several pages and schema. Current published first-hour offer is £15 including four drinks, then £8 per extra hour. Older owner records say £12; reconcile before changing.
- Menu.html contains in-café highlights. Uber Eats prices and stock are a different source; never copy delivery prices into the café menu automatically.
- Parking/access: free on-site parking, step-free street-level entry, accessible parking, no accessible toilet. Private hire: up to60 depending layout,3-hour minimum,£50 outside-food fee; agreed quote confirms catering/access/safe capacity.
- Movie requests require verified screening permissions and setup. Publish dated events only when confirmed.

## Forms and privacy

booking.js and enquiry.js send to the existing Web3Forms account. A successful HTTP response must contain success:true. Test failures as well as success; keep test messages clearly labelled and verify actual inbox delivery separately. Do not place a booking/payment during QA.

site.js emits local dataLayer/custom events; no analytics collector is installed. Thank-you events require a recent one-use session receipt. Do not claim collected conversions or field Core Web Vitals until an approved analytics destination and privacy setup are connected.

The CSP allows same-origin scripts only. Keep code in external scripts and update cache version strings with asset changes. No cookies for ads/analytics currently load; disclose new providers before deployment.

## Before publishing

Check links/fragments, heading structure, JSON-LD and matching visible information. Exercise closed Tuesdays, UK midnight slots, invalid form, failure/retry/confirmed response, mobile menu and keyboard focus. Check390/768/1440px and zoom with real installed browsers; source checks are not a substitute for devices. Verify live pages and inbox routing after successful Pages deployment.

## Account-level items

Enable Enforce HTTPS in GitHub Pages if HTTP still serves the site. Registrar forwarding should preserve paths from the old domain. Search Console, analytics account/property, current complete menu, reconciled hours/offer and game inventory remain owner inputs.
