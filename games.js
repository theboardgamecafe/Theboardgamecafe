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
      card.querySelector('[data-session-details]').textContent = (session.live ? [
        session.game, session.style, durationLabel(session.durationMinutes), session.price ? `${session.price} a seat` : ''
      ] : [
        durationLabel(session.durationMinutes),
        typeof session.level === 'string' ? session.level.trim() : '',
        typeof session.host === 'string' && session.host.trim() ? `Hosted by ${session.host.trim()}` : ''
      ]).filter(Boolean).join(' · ');

      if (session.live) {
        // A game hosted in the café app: the visitor picks their seat and pays for it there.
        seats.textContent = `${session.seatsOpen} ${session.seatsOpen === 1 ? 'seat' : 'seats'} left`;
        request.textContent = 'Join this game';
        request.href = session.link;
        request.setAttribute('aria-label', `Join ${session.title}, ${when.textContent}`);
      } else if (!session.seatsOpen) {
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

    const startsWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    const gamesApi = (calendar.dataset.gamesApi || '').trim().replace(/\/$/, '');
    let scheduled = [];
    let scheduleFailed = false;
    // null until the app says its games are on. Then the list of games open to join, which may be empty.
    let liveGames = null;
    let filter = 'all';

    // Sessions the café runs itself, from the website's own schedule file.
    async function loadSchedule() {
      const response = await fetch(calendar.dataset.sessionsUrl, {cache: 'no-cache'});
      if (!response.ok) throw new Error('Schedule unavailable');
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error('Invalid schedule');
      return entries.filter(session => session?.status === 'confirmed'
        && typeof session.title === 'string' && session.title.trim()
        && typeof session.startsAt === 'string' && startsWithOffset.test(session.startsAt)
        && Number.isInteger(session.durationMinutes) && session.durationMinutes > 0
        && Number.isInteger(session.seatsOpen) && session.seatsOpen >= 0)
        .map(session => ({...session, live: false, title: session.title.trim(), start: Date.parse(session.startsAt)}))
        .filter(session => Number.isFinite(session.start));
    }

    // Games players are hosting in the café app. Returns null when the app is not listing games, or cannot be reached.
    async function loadLiveGames() {
      if (!gamesApi) return null;
      const read = async path => {
        const response = await fetch(gamesApi + path, {cache: 'no-store', headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error('App unavailable');
        return response.json();
      };
      try {
        const config = await read('/api/config');
        if (config?.features?.groups !== true) return null;
        const labels = new Map((Array.isArray(config.groupGames) ? config.groupGames : []).map(game => [game.id, game.label]));
        const {groups} = await read('/api/groups');
        if (!Array.isArray(groups)) return null;
        return groups.filter(group => typeof group?.id === 'string' && typeof group.title === 'string' && group.title.trim()
          && typeof group.start === 'string' && startsWithOffset.test(group.start)
          && Number.isInteger(group.duration) && group.duration > 0
          && Number.isInteger(group.seatsAvailable) && group.seatsAvailable > 0)
          .map(group => {
            const link = new URL('/', gamesApi);
            link.searchParams.set('group', group.id);
            link.hash = 'tables';
            return {live: true, title: group.title.trim(), startsAt: group.start, start: Date.parse(group.start),
              durationMinutes: group.duration * 60, seatsOpen: group.seatsAvailable,
              game: typeof labels.get(group.game) === 'string' ? labels.get(group.game) : '',
              style: group.style === 'competitive' ? 'Competitive' : 'Friendly',
              price: Number.isSafeInteger(group.nextShare) && group.nextShare > 0 ? `£${(group.nextShare / 100).toFixed(2)}` : '',
              link: link.href};
          }).filter(session => Number.isFinite(session.start));
      } catch (_) {
        return null;
      }
    }

    // With the app's games on, visitors join and host there. Until then the page keeps its enquiry wording.
    function showLiveWording() {
      const intro = document.getElementById('open-games-intro');
      const hostNote = document.getElementById('host-game-note');
      const hostLink = document.getElementById('host-game-link');
      const heading = document.getElementById('game-calendar-heading');
      if (heading) heading.textContent = 'Open games';
      if (intro) intro.textContent = 'Coming on your own or looking for another player? Pick a game, pay for your seat and you’re in.';
      if (hostNote) hostNote.textContent = 'Choose a game and a time, pay for your own seat, and your game is listed here for other players to join.';
      if (hostLink) {
        hostLink.textContent = 'Host a game';
        hostLink.href = gamesApi + '/tables';
      }
    }

    function showSessions() {
      const now = Date.now();
      const today = londonDay(now);
      const weekday = new Date(today).getUTCDay();
      const friday = today + (weekday === 0 ? -2 : 5 - weekday) * dayMs;
      const ranges = {today: [today, today], tomorrow: [today + dayMs, today + dayMs], weekend: [friday, friday + 2 * dayMs]};
      const range = ranges[filter];
      const upcoming = [...scheduled, ...(liveGames ?? [])].filter(session => session.start > now).sort((a, b) => a.start - b.start);
      const visible = range ? upcoming.filter(session => {
        const day = londonDay(session.start);
        return day >= range[0] && day <= range[1];
      }) : upcoming;

      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.sessionFilter === filter));
      list.textContent = '';
      list.append(...visible.map(sessionCard));
      list.hidden = !visible.length;
      empty.hidden = Boolean(visible.length);
      const noun = liveGames ? 'game' : 'session';
      if (visible.length) {
        count.textContent = `${visible.length} ${visible.length === 1 ? noun : `${noun}s`} shown.`;
      } else if (scheduleFailed && !liveGames) {
        emptyTitle.textContent = 'The session schedule is unavailable';
        emptyNote.textContent = 'Use the enquiry below to check what’s coming up.';
        count.textContent = emptyTitle.textContent;
      } else {
        const when = {today: 'today', tomorrow: 'tomorrow', weekend: 'this weekend'}[filter];
        emptyTitle.textContent = liveGames ? (when ? `No open games ${when}` : 'No open games right now')
          : when ? `No confirmed sessions ${when}` : 'No sessions confirmed yet';
        emptyNote.textContent = upcoming.length ? 'Try All dates or ask us about a game below.'
          : liveGames ? 'Be the first: host a game below, or ask us about one.' : 'Have a game in mind? Ask us or propose a session below.';
        count.textContent = emptyTitle.textContent;
      }
      controls.hidden = scheduleFailed && !liveGames;
    }

    for (const button of buttons) {
      button.addEventListener('click', () => {
        filter = button.dataset.sessionFilter;
        showSessions();
      });
    }

    emptyTitle.textContent = 'Checking upcoming sessions…';
    const [schedule, games] = await Promise.all([loadSchedule().catch(() => null), loadLiveGames()]);
    scheduled = schedule ?? [];
    scheduleFailed = schedule === null;
    liveGames = games;
    if (liveGames) showLiveWording();
    showSessions();

    // Seats fill and new games appear, so the list is read again each minute while the page is on screen.
    if (gamesApi) {
      let refreshing = false;
      const refresh = async () => {
        if (refreshing || document.visibilityState !== 'visible') return;
        refreshing = true;
        const latest = await loadLiveGames();
        refreshing = false;
        // A failed read keeps the games already shown.
        if (!latest) return;
        if (!liveGames) showLiveWording();
        liveGames = latest;
        showSessions();
      };
      setInterval(refresh, 60_000);
      document.addEventListener('visibilitychange', refresh);
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
