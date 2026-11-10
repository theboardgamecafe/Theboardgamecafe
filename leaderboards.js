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

  loadLeaderboards();
})();
