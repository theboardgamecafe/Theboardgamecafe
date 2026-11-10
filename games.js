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
    const calendar = document.getElementById('game-calendar');
    if (calendar) setupSessionCalendar(calendar, fallback);
  }

  async function setupSessionCalendar(calendar, whatsappBase) {
    const controls = calendar.querySelector('#session-filters');
    const buttons = [...controls.querySelectorAll('[data-session-filter]')];
    const count = calendar.querySelector('#session-count');
    const list = calendar.querySelector('#session-list');
    const empty = calendar.querySelector('#session-empty');
    const emptyTitle = calendar.querySelector('#session-empty-title');
    const emptyNote = calendar.querySelector('#session-empty-note');
    const cardTemplate = calendar.querySelector('#session-card-template');
    const dayMs = 86_400_000;
    const timeZone = 'Europe/London';
    const dayKey = new Intl.DateTimeFormat('en-GB', {timeZone, year: 'numeric', month: 'numeric', day: 'numeric'});
    const dayLabel = new Intl.DateTimeFormat('en-GB', {timeZone, weekday: 'short', day: 'numeric', month: 'short'});
    const requestDate = new Intl.DateTimeFormat('en-GB', {timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
    const timeLabel = new Intl.DateTimeFormat('en-GB', {timeZone, hour: 'numeric', minute: '2-digit', hour12: true});

    function londonDay(timestamp) {
      const parts = Object.fromEntries(dayKey.formatToParts(timestamp).map(({type, value}) => [type, value]));
      return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    }

    function durationLabel(minutes) {
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      if (!hours) return `${minutes} min`;
      if (!remainder) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      return `${hours} h ${remainder} min`;
    }

    function sessionCard(session) {
      const card = cardTemplate.content.cloneNode(true);
      const when = card.querySelector('[data-session-time]');
      const seats = card.querySelector('[data-session-seats]');
      const request = card.querySelector('[data-session-request]');
      const time = timeLabel.format(session.start);
      when.dateTime = session.startsAt;
      when.textContent = `${dayLabel.format(session.start)} · ${time}`;
      card.querySelector('[data-session-title]').textContent = session.title;
      card.querySelector('[data-session-details]').textContent = [
        durationLabel(session.durationMinutes),
        typeof session.level === 'string' ? session.level.trim() : '',
        typeof session.host === 'string' && session.host.trim() ? `Hosted by ${session.host.trim()}` : ''
      ].filter(Boolean).join(' · ');

      if (!session.seatsOpen) {
        seats.textContent = 'Full';
        seats.classList.add('is-full');
        request.remove();
      } else {
        seats.textContent = `${session.seatsOpen} ${session.seatsOpen === 1 ? 'seat' : 'seats'} left`;
        const url = new URL(whatsappBase);
        const date = requestDate.format(session.start);
        url.searchParams.set('text', `Hi, could I request a seat for ${session.title} on ${date} at ${time} (UK time) at The Board Game Café? Please let me know if there’s space.`);
        request.href = url.href;
        request.setAttribute('aria-label', `Request a seat for ${session.title}, ${when.textContent}`);
      }
      return card;
    }

    emptyTitle.textContent = 'Checking upcoming sessions…';
    try {
      const response = await fetch(calendar.dataset.sessionsUrl, {cache: 'no-cache'});
      if (!response.ok) throw new Error('Schedule unavailable');
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error('Invalid schedule');

      const startsWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;
      const sessions = entries.filter(session => session?.status === 'confirmed'
        && typeof session.title === 'string' && session.title.trim()
        && typeof session.startsAt === 'string' && startsWithOffset.test(session.startsAt)
        && Number.isInteger(session.durationMinutes) && session.durationMinutes > 0
        && Number.isInteger(session.seatsOpen) && session.seatsOpen >= 0)
        .map(session => ({...session, title: session.title.trim(), start: Date.parse(session.startsAt)}))
        .filter(session => Number.isFinite(session.start))
        .sort((a, b) => a.start - b.start);

      function showSessions(filter) {
        const now = Date.now();
        const today = londonDay(now);
        const weekday = new Date(today).getUTCDay();
        const friday = today + (weekday === 0 ? -2 : 5 - weekday) * dayMs;
        const ranges = {today: [today, today], tomorrow: [today + dayMs, today + dayMs], weekend: [friday, friday + 2 * dayMs]};
        const range = ranges[filter];
        const upcoming = sessions.filter(session => session.start > now);
        const visible = range ? upcoming.filter(session => {
          const day = londonDay(session.start);
          return day >= range[0] && day <= range[1];
        }) : upcoming;

        for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.sessionFilter === filter));
        list.textContent = '';
        list.append(...visible.map(sessionCard));
        list.hidden = !visible.length;
        empty.hidden = Boolean(visible.length);
        if (visible.length) {
          count.textContent = `${visible.length} ${visible.length === 1 ? 'session' : 'sessions'} shown.`;
        } else {
          const when = {today: 'today', tomorrow: 'tomorrow', weekend: 'this weekend'}[filter];
          emptyTitle.textContent = when ? `No confirmed sessions ${when}` : 'No sessions confirmed yet';
          emptyNote.textContent = upcoming.length ? 'Try All dates or ask us about a game below.' : 'Have a game in mind? Ask us or propose a session below.';
          count.textContent = emptyTitle.textContent;
        }
      }

      for (const button of buttons) button.addEventListener('click', () => showSessions(button.dataset.sessionFilter));
      showSessions('all');
      controls.hidden = false;
    } catch (_) {
      emptyTitle.textContent = 'The session schedule is unavailable';
      emptyNote.textContent = 'Use the enquiry below to check what’s coming up.';
      count.textContent = emptyTitle.textContent;
    }
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
