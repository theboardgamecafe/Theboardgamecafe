(() => {
  const choices = document.querySelector('.offers-preferences');
  const email = document.getElementById('offers-email');
  const whatsapp = document.getElementById('offers-whatsapp');
  const emailLink = document.getElementById('offers-confirm-email');
  const whatsappLink = document.getElementById('offers-confirm-whatsapp');
  const confirmation = document.getElementById('offers-confirmation');
  if (!choices || !email || !whatsapp || !emailLink || !whatsappLink || !confirmation) return;

  function update() {
    emailLink.hidden = !email.checked;
    whatsappLink.hidden = !whatsapp.checked;
    confirmation.textContent = email.checked || whatsapp.checked
      ? 'Complete the confirmation for each selected channel. Each opens separately.'
      : '';
  }

  for (const [checkbox, link] of [[email, emailLink], [whatsapp, whatsappLink]]) {
    checkbox.addEventListener('change', update);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  window.addEventListener('pageshow', update);
  update();
  choices.hidden = false;
})();
