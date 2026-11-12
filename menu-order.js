// Shows "Order to your table" on the menu page while the café app is taking food and drink orders.
// The button stays hidden if the app has ordering switched off or cannot be reached.
(() => {
  const link = document.getElementById('order-in-app');
  const api = ((link && link.dataset.orderApi) || '').trim().replace(/\/$/, '');
  if (!link || !api) return;
  try {
    fetch(api + '/api/config', {cache: 'no-store', headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(8000)})
      .then(response => (response.ok ? response.json() : null))
      .then(config => {
        if (config && config.features && config.features.ordering === true) link.hidden = false;
      })
      .catch(() => {});
  } catch (error) { /* An older browser: the button simply stays hidden. */ }
})();
