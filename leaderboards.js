(() => {
  const boards = Array.from(document.querySelectorAll('[data-leaderboard]'));
  if (!boards.length) return;

  const boardNames = ['fc27', 'chess', 'boxing'];
  const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;

  function verifiedTimestamp(value) {
    if (typeof value !== 'string') return NaN;
    const parts = timestampPattern.exec(value);
    if (!parts) return NaN;
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]
      || Number(parts[4]) > 23 || Number(parts[5]) > 59 || Number(parts[6] || 0) > 59
      || Number(parts[8] || 0) > 23 || Number(parts[9] || 0) > 59) return NaN;
    return Date.parse(value);
  }

  function standings(records, name, now) {
    const players = new Map();
    records.forEach(record => {
      if (!record || typeof record !== 'object' || record.verified !== true
        || typeof record.playerId !== 'string' || !record.playerId.trim()
        || typeof record.displayName !== 'string' || !record.displayName.trim()
        || record.displayName.trim().length > 60) return;

      const verifiedAt = verifiedTimestamp(record.verifiedAt);
      if (!Number.isFinite(verifiedAt) || verifiedAt > now) return;
      const value = name === 'boxing' ? record.score : record.rating;
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      if (name === 'boxing') {
        if (!Number.isInteger(value) || value < 0 || value > 999) return;
      } else if (value < 1 || value > 4 || Math.round(value * 10) / 10 !== value) {
        return;
      }

      const playerId = record.playerId.trim();
      const previous = players.get(playerId);
      const entry = {playerId, displayName: record.displayName.trim(), value, verifiedAt};
      if (!previous || (name === 'boxing'
        ? value > previous.value || (value === previous.value && verifiedAt > previous.verifiedAt)
        : verifiedAt > previous.verifiedAt)) players.set(playerId, entry);
    });

    return Array.from(players.values()).sort((a, b) => b.value - a.value
      || a.displayName.localeCompare(b.displayName, 'en-GB')
      || a.playerId.localeCompare(b.playerId, 'en-GB'));
  }

  function renderBoard(board, entries, error) {
    const status = board.querySelector('[data-board-status]');
    const table = board.querySelector('[data-board-table]');
    const rows = board.querySelector('[data-board-rows]');
    const name = board.getAttribute('data-leaderboard');
    rows.textContent = '';
    table.hidden = true;
    if (error) {
      status.textContent = 'This leaderboard is temporarily unavailable. Please try again later.';
      return;
    }
    if (!entries.length) {
      status.textContent = name === 'boxing'
        ? 'The first verified scores will appear here.'
        : 'The first verified ratings will appear here.';
      return;
    }

    let rank = 0;
    entries.forEach((entry, index) => {
      if (index === 0 || entry.value !== entries[index - 1].value) rank = index + 1;
      const row = document.createElement('tr');
      const classes = ['leaderboard-rank', 'leaderboard-player', 'leaderboard-value'];
      [String(rank), entry.displayName, String(entry.value)].forEach((value, column) => {
        const cell = document.createElement('td');
        cell.className = classes[column];
        cell.textContent = value;
        if (column === 1 && name !== 'boxing') {
          const tier = document.createElement('span');
          tier.className = 'leaderboard-tier';
          tier.textContent = entry.value < 2 ? 'Beginner'
            : entry.value < 3 ? 'Developing' : entry.value < 4 ? 'Skilled' : 'Elite';
          cell.appendChild(tier);
        }
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    status.textContent = `${entries.length} verified ${entries.length === 1 ? 'player' : 'players'}.`;
    table.hidden = false;
  }

  async function loadLeaderboards() {
    try {
      const response = await fetch('./leaderboards.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('Leaderboards unavailable');
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid leaderboards');
      const now = Date.now();
      boards.forEach(board => {
        const name = board.getAttribute('data-leaderboard');
        if (!boardNames.includes(name) || !Array.isArray(data[name])) {
          renderBoard(board, [], true);
          return;
        }
        renderBoard(board, standings(data[name], name, now), false);
      });
    } catch (error) {
      boards.forEach(board => renderBoard(board, [], true));
    }
  }

  // ---------- Live boards from the café app ----------
  // When the app has games switched on, its boards are shown here instead of the file above: FC27 and Chess by
  // skill level, and the boxing machine with a board for this month (shown first) and one for all time.
  const grid = document.querySelector('[data-boards-api]');
  const api = ((grid && grid.dataset.boardsApi) || '').trim().replace(/\/$/, '');
  const appGames = {fc27: 'fc-27', chess: 'chess', boxing: 'boxing'};
  const usernamePattern = /^[A-Za-z0-9_.-]{3,20}$/;
  let boxingPeriod = 'month';
  let boxingRequest = 0;

  async function read(path) {
    const response = await fetch(api + path, {cache: 'no-store', headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('App unavailable');
    return response.json();
  }

  const boardPath = name => `/api/players/leaderboard?game=${appGames[name]}${name === 'boxing' ? `&period=${boxingPeriod}` : ''}`;

  function renderLiveBoard(board, data) {
    const name = board.getAttribute('data-leaderboard');
    const boxing = name === 'boxing';
    const status = board.querySelector('[data-board-status]');
    const table = board.querySelector('[data-board-table]');
    const rows = board.querySelector('[data-board-rows]');
    const entries = (Array.isArray(data && data.entries) ? data.entries : []).filter(entry => entry
      && typeof entry.username === 'string' && usernamePattern.test(entry.username)
      && Number.isInteger(entry.rank) && entry.rank > 0
      && (boxing ? Number.isInteger(entry.score) && entry.score >= 1 && entry.score <= 999
        : typeof entry.level === 'number' && entry.level >= 1 && entry.level <= 4));
    // An app that knows about the monthly board says which one it sent. An older one sends all time only.
    const month = boxing && data.period === 'month' && typeof data.month === 'string' && data.month.length <= 30 ? data.month : '';
    if (boxing) {
      const period = board.querySelector('[data-board-period]');
      const intro = board.querySelector('[data-board-intro]');
      const known = data.period === 'month' || data.period === 'all';
      if (period) {
        period.hidden = !known;
        period.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.period === data.period)));
      }
      if (intro) intro.textContent = month ? `Best scores in ${month}. The board starts again on the 1st of each month.` : 'Best scores of all time.';
    }

    rows.textContent = '';
    table.hidden = !entries.length;
    if (!entries.length) {
      status.textContent = month ? `No scores in ${month} yet. Have a go and ask the team to record your score.`
        : boxing ? 'No scores yet. Have a go and ask the team to record your score.'
          : 'No rated games yet. Play a competitive game through the café app to get on the board.';
      return;
    }
    entries.forEach(entry => {
      const row = document.createElement('tr');
      const tier = boxing ? '' : `${typeof entry.label === 'string' ? entry.label.slice(0, 20) : ''}${entry.provisional === true ? ' · provisional' : ''}`;
      [['leaderboard-rank', String(entry.rank)], ['leaderboard-player', entry.username],
        ['leaderboard-value', boxing ? String(entry.score) : entry.level.toFixed(1)]].forEach(([className, value], column) => {
        const cell = document.createElement('td');
        cell.className = className;
        cell.textContent = value;
        if (column === 1 && tier) {
          const label = document.createElement('span');
          label.className = 'leaderboard-tier';
          label.textContent = tier;
          cell.appendChild(label);
        }
        row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    status.textContent = `${entries.length} ${entries.length === 1 ? 'player' : 'players'}${month ? ` in ${month}` : ''}.`;
  }

  // True once the app's boards are on the page. False when the app has games off or cannot be reached.
  async function loadLiveBoards() {
    if (!api) return false;
    try {
      const config = await read('/api/config');
      if (!config || !config.features || config.features.groups !== true) return false;
      const known = boards.filter(board => Object.prototype.hasOwnProperty.call(appGames, board.getAttribute("data-leaderboard")));
      const results = await Promise.all(known.map(board => read(boardPath(board.getAttribute('data-leaderboard')))));
      document.querySelectorAll('[data-live]').forEach(element => { element.textContent = element.dataset.live; });
      known.forEach((board, index) => renderLiveBoard(board, results[index]));
      return true;
    } catch (error) {
      return false;
    }
  }

  const boxingBoard = boards.find(board => board.getAttribute('data-leaderboard') === 'boxing');
  if (boxingBoard) {
    boxingBoard.querySelectorAll('[data-board-period] button').forEach(button => {
      button.addEventListener('click', async () => {
        boxingPeriod = button.dataset.period === 'all' ? 'all' : 'month';
        const request = ++boxingRequest;
        try {
          const data = await read(boardPath('boxing'));
          if (request === boxingRequest) renderLiveBoard(boxingBoard, data);
        } catch (error) {
          if (request === boxingRequest) boxingBoard.querySelector('[data-board-status]').textContent = 'This leaderboard is temporarily unavailable. Please try again later.';
        }
      });
    });
  }

  loadLiveBoards().then(live => { if (!live) loadLeaderboards(); });
})();
