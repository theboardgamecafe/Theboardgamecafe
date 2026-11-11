/* Live Google rating and reviews for the home page.
   Inactive until data-maps-key is set on #google-reviews. If the key is missing,
   the Maps script is blocked, or the lookup fails, the hand-maintained rating and
   review cards already in the page stay as they are.
   Places content must not be stored or cached, so nothing is saved between visits. */
(() => {
"use strict";

const section = document.getElementById("google-reviews");
if (!section) return;
const key = (section.dataset.mapsKey || "").trim();
const placeId = (section.dataset.placeId || "").trim();
if (!key || !placeId) return;

const numberEl = section.querySelector(".cafe-rating-number");
const ratingStarsEl = section.querySelector(".cafe-rating .cafe-stars");
const labelEl = section.querySelector(".cafe-rating-label");
const cardsEl = section.querySelector(".cafe-review-cards");
const linkEl = section.querySelector(".cafe-review-link");
if (!numberEl || !ratingStarsEl || !labelEl || !cardsEl) return;

const MAX_REVIEWS = 4;
const MAX_CHARS = 280;

function stars(value) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function shorten(text) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CHARS) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", MAX_CHARS)) + "…";
}

function externalLink(href, text) {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = text;
  return a;
}

function isHttps(value) {
  return typeof value === "string" && value.startsWith("https://");
}

function reviewCard(review) {
  const author = review.authorAttribution;
  const card = document.createElement("blockquote");
  card.className = "cafe-review-card";

  const rating = document.createElement("span");
  rating.className = "cafe-stars";
  rating.setAttribute("role", "img");
  rating.setAttribute("aria-label", review.rating + " out of 5 stars");
  rating.textContent = stars(review.rating);

  const body = document.createElement("p");
  body.textContent = "“" + shorten(review.text) + "”";

  const cite = document.createElement("cite");
  cite.append(isHttps(author.uri) ? externalLink(author.uri, author.displayName) : author.displayName);
  if (review.relativePublishTimeDescription) cite.append(" · " + review.relativePublishTimeDescription);
  cite.append(" · Google Maps");
  if (isHttps(review.flagContentURI)) cite.append(" · ", externalLink(review.flagContentURI, "Report"));

  card.append(rating, body, cite);
  return card;
}

function render(place) {
  const reviews = (place.reviews || [])
    .filter(r => r && typeof r.rating === "number" && r.text && r.authorAttribution && r.authorAttribution.displayName)
    .slice(0, MAX_REVIEWS);

  if (typeof place.rating === "number") {
    const outOf = document.createElement("small");
    outOf.textContent = "/5";
    numberEl.replaceChildren(place.rating.toFixed(1), outOf);
    ratingStarsEl.textContent = stars(place.rating);
    ratingStarsEl.setAttribute("aria-label", place.rating.toFixed(1) + " out of 5 stars");
    labelEl.textContent = typeof place.userRatingCount === "number"
      ? place.userRatingCount + " reviews on Google Maps"
      : "on Google Maps";
  }
  if (reviews.length) cardsEl.replaceChildren(...reviews.map(reviewCard));
  if (linkEl && isHttps(place.googleMapsURI)) linkEl.href = place.googleMapsURI;
  section.dataset.reviewsSource = "live";
}

function loadMaps() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Google Maps timed out")), 12000);
    window.__tbgcMapsReady = () => { clearTimeout(timer); resolve(); };
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) +
      "&v=weekly&loading=async&callback=__tbgcMapsReady";
    script.async = true;
    script.onerror = () => { clearTimeout(timer); reject(new Error("Google Maps did not load")); };
    document.head.append(script);
  });
}

let started = false;
async function start() {
  if (started) return;
  started = true;
  try {
    await loadMaps();
    const { Place } = await google.maps.importLibrary("places");
    const place = new Place({ id: placeId });
    await place.fetchFields({ fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"] });
    render(place);
  } catch (error) {
    console.warn("[TBGC reviews] Showing saved reviews:", error && error.message ? error.message : error);
  }
}

// Only ask Google when the reviews are about to come into view, so visitors who
// never scroll that far do not trigger a billed lookup.
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      start();
    }
  }, { rootMargin: "600px 0px" });
  observer.observe(section);
} else {
  start();
}
})();
