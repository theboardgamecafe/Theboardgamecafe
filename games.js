(() => {
  const openGamesChoice = document.getElementById('open-games-choice');
  const openGamesGame = document.getElementById('open-games-game');
  const openGamesWhatsApp = document.getElementById('open-games-whatsapp');
  if (openGamesChoice && openGamesGame && openGamesWhatsApp) {
    const fallback = new URL(openGamesWhatsApp.href);
    openGamesGame.addEventListener('change', () => {
      const url = new URL(fallback);
      if (openGamesGame.value) {
        url.searchParams.set('text', `Hi, I’m looking to join an open game of ${openGamesGame.value} at The Board Game Café. Are there any places coming up?`);
      }
      openGamesWhatsApp.href = url.href;
    });
    openGamesChoice.hidden = false;
  }

  const filters = document.getElementById('game-filters');
  const search = document.getElementById('game-search');
  const players = document.getElementById('game-players');
  const age = document.getElementById('game-age');
  const length = document.getElementById('game-length');
  const style = document.getElementById('game-style');
  const count = document.getElementById('game-count');
  const empty = document.getElementById('game-empty');
  const pick = document.getElementById('game-pick');
  const reset = document.getElementById('game-reset');
  const result = document.getElementById('game-pick-result');
  const resultName = document.getElementById('game-pick-name');
  const pickStatus = document.getElementById('game-pick-status');
  const resultLink = document.getElementById('game-pick-link');
  const cards = [...document.querySelectorAll('#game-cards .game-card')].map(card => ({
    card,
    name: card.querySelector('h3').textContent,
    link: card.querySelector('a').getAttribute('href')
  }));
  const fields = [search, players, age, length, style];
  let visible = cards;
  let lastPick;

  function updateResults() {
    const query = search.value.trim().toLowerCase();
    const playerCount = Number(players.value);
    const youngest = Number(age.value);
    visible = cards.filter(({card, name}) => {
      const metadata = card.dataset;
      const searchable = `${name} ${metadata.search || ''}`.toLowerCase();
      const matches = searchable.includes(query)
        && (!playerCount || (playerCount >= Number(metadata.playersMin) && playerCount <= Number(metadata.playersMax)))
        && (!youngest || youngest >= Number(metadata.age))
        && (!length.value || length.value === metadata.length)
        && (!style.value || metadata.style.split(' ').includes(style.value));
      card.hidden = !matches;
      return matches;
    });
    count.textContent = visible.length === 1 ? '1 game found' : `${visible.length} games found`;
    pick.disabled = visible.length === 0;
    empty.hidden = visible.length > 0;
    result.hidden = true;
    pickStatus.textContent = '';
    lastPick = undefined;
  }

  search.addEventListener('input', updateResults);
  [players, age, length, style].forEach(field => field.addEventListener('change', updateResults));
  reset.addEventListener('click', () => {
    fields.forEach(field => { field.value = ''; });
    updateResults();
    search.focus();
  });
  pick.addEventListener('click', () => {
    const choices = visible.length > 1 ? visible.filter(game => game !== lastPick) : visible;
    if (!choices.length) return;
    lastPick = choices[Math.floor(Math.random() * choices.length)];
    result.hidden = false;
    resultName.textContent = `Try ${lastPick.name}.`;
    pickStatus.textContent = resultName.textContent;
    resultLink.href = lastPick.link;
  });

  updateResults();
  filters.hidden = false;
})();
