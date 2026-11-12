/* Contact page map. Nothing is requested from Google until the visitor taps "Show map". */
(() => {
"use strict";
const holder = document.getElementById("cafe-map");
const button = document.getElementById("show-map");
if (!holder || !button) return;
const src = holder.dataset.mapSrc || "";
if (!src.startsWith("https://www.google.com/maps?")) return;
button.addEventListener("click", () => {
  const frame = document.createElement("iframe");
  frame.src = src;
  frame.title = "Map showing The Board Game Café at The Stables, Eanam, Blackburn";
  frame.loading = "lazy";
  frame.referrerPolicy = "no-referrer";
  frame.allowFullscreen = true;
  button.replaceWith(frame);
  const note = document.getElementById("map-note");
  if (note) note.textContent = "Map provided by Google. If it does not load, use the directions link above.";
});
})();
