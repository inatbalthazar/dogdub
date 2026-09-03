/**
 * Choicer Voicer - Multiplayer Lobby & Game View Manager
 * Streamlined Flow: Home (List / Create) ---> Waiting Room ---> Game Screen
 */

(function () {
  'use strict';

  // Global state
  let availablePacks = [];
  let currentRoom = null;
  let roomToken = null;
  let pollTimer = null;
  let activePassPopover = null;
  let lastNotifiedPassTime = 0;
  let currentFilter = 'all';
  let searchQuery = '';
  let cachedRooms = [];

  // Local storage keys
  const LS_PLAYER_NAME = 'cv_player_name';
  const LS_ROOM_CODE = 'cv_current_room_code';
  const LS_ROOM_TOKEN_PREFIX = 'cv_room_token_';

  // --------------------------------------------------------------------------
  // Local Storage & Player Profile
  // --------------------------------------------------------------------------
  function getStoredPlayerName() {
    let name = localStorage.getItem(LS_PLAYER_NAME);
    if (!name || !name.trim()) {
      name = 'Player_' + Math.floor(100 + Math.random() * 900);
      localStorage.setItem(LS_PLAYER_NAME, name);
    }
    return name.trim();
  }

  function setStoredPlayerName(name) {
    if (name && name.trim()) {
      localStorage.setItem(LS_PLAYER_NAME, name.trim());
      updateTopbarPlayerName();
    }
  }

  function updateTopbarPlayerName() {
    const nameEl = document.getElementById('topbarPlayerName');
    if (nameEl) {
      nameEl.textContent = getStoredPlayerName();
    }
  }

  function getRoomToken(code) {
    return localStorage.getItem(LS_ROOM_TOKEN_PREFIX + code) || null;
  }

  function setRoomToken(code, token) {
    if (code && token) {
      localStorage.setItem(LS_ROOM_TOKEN_PREFIX + code, token);
      localStorage.setItem(LS_ROOM_CODE, code);
    }
  }

  function clearRoomSession(code) {
    if (code) {
      localStorage.removeItem(LS_ROOM_TOKEN_PREFIX + code);
    }
    localStorage.removeItem(LS_ROOM_CODE);
    currentRoom = null;
    roomToken = null;
  }

  // --------------------------------------------------------------------------
  // API Helper
  // --------------------------------------------------------------------------
  async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (roomToken) {
      options.headers['x-room-token'] = roomToken;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    return data;
  }

  // --------------------------------------------------------------------------
  // View Switcher: 'home' | 'waiting' | 'game'
  // --------------------------------------------------------------------------
  function switchView(viewName) {
    document.body.classList.remove('view-home', 'view-waiting', 'view-game');
    document.body.classList.add(`view-${viewName}`);

    const homeView = document.getElementById('viewHomeLobby');
    const waitingView = document.getElementById('viewWaitingRoom');
    const turnBar = document.getElementById('inGameTurnBar');
    const btnTopCreate = document.getElementById('btnTopCreateRoom');

    if (homeView) homeView.style.display = (viewName === 'home') ? 'block' : 'none';
    if (waitingView) waitingView.style.display = (viewName === 'waiting') ? 'block' : 'none';
    if (turnBar) turnBar.style.display = (viewName === 'game') ? 'flex' : 'none';
    if (btnTopCreate) btnTopCreate.style.display = (viewName === 'home') ? 'inline-flex' : 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const BUILTIN_DEFAULT_PACKS = [
    {
      id: 'guardians_meet_avengers',
      filename: 'guardians_meet_avengers.zip',
      title: 'Guardians Meet Avengers',
      author: 'Choicer Voicer',
      description: 'When the Guardians of the Galaxy encounter the unconscious Thor floating in deep space.',
      linesCount: 5,
      characters: ['STAR-LORD', 'DRAX', 'GAMORA', 'THOR'],
      size: 359136,
      sizeFormatted: '351 KB',
      updatedAt: 1788373105791,
      url: '/packs/guardians_meet_avengers.zip'
    },
    {
      id: 'pulp_fiction_royale',
      filename: 'pulp_fiction_royale.zip',
      title: 'Pulp Fiction: Royale with Cheese',
      author: 'Choicer Voicer',
      description: 'Vincent and Jules discuss the little differences between America and Europe.',
      linesCount: 5,
      characters: ['VINCENT', 'JULES'],
      size: 364158,
      sizeFormatted: '356 KB',
      updatedAt: 1788373159977,
      url: '/packs/pulp_fiction_royale.zip'
    },
    {
      id: 'star_wars_father',
      filename: 'star_wars_father.zip',
      title: 'Star Wars: I Am Your Father',
      author: 'Choicer Voicer',
      description: 'The legendary confrontation between Darth Vader and Luke Skywalker on Cloud City.',
      linesCount: 3,
      characters: ['DARTH VADER', 'LUKE'],
      size: 270446,
      sizeFormatted: '264 KB',
      updatedAt: 1788373105836,
      url: '/packs/star_wars_father.zip'
    },
    {
      id: 'matrix_red_pill',
      filename: 'matrix_red_pill.zip',
      title: 'The Matrix: Red or Blue Pill',
      author: 'Choicer Voicer',
      description: 'Morpheus offers Neo the choice between blissful illusion and harsh reality.',
      linesCount: 3,
      characters: ['MORPHEUS'],
      size: 357510,
      sizeFormatted: '349 KB',
      updatedAt: 1788373160025,
      url: '/packs/matrix_red_pill.zip'
    }
  ];

  // --------------------------------------------------------------------------
  // Fetch Packs & Render Showcase
  // --------------------------------------------------------------------------
  async function fetchPacks() {
    try {
      const data = await apiFetch('/api/packs');
      if (data && Array.isArray(data.packs) && data.packs.length > 0) {
        availablePacks = data.packs;
        renderShowcasePacks();
        return availablePacks;
      }
    } catch (err) {
      console.warn('Could not fetch packs list from /api/packs, using default packs:', err);
    }
    if (!availablePacks || availablePacks.length === 0) {
      availablePacks = BUILTIN_DEFAULT_PACKS;
      renderShowcasePacks();
    }
    return availablePacks;
  }

  function renderShowcasePacks() {
    const grid = document.getElementById('showcasePacksGrid');
    if (!grid) return;

    if (availablePacks.length === 0) {
      grid.innerHTML = '<p style="color: var(--muted); font-size: 0.82rem;">ไม่พบ Scene Pack</p>';
      return;
    }

    grid.innerHTML = availablePacks.map(pack => `
      <div class="showcase-pack-card">
        <div>
          <div class="showcase-pack-head">
            <span style="font-size: 1.2rem;">🎬</span>
            <span class="showcase-pack-title">${escapeHTML(pack.title)}</span>
          </div>
          <p class="showcase-pack-desc">${escapeHTML(pack.description || '')}</p>
        </div>
        <div>
          <div class="showcase-pack-tags">
            <span class="showcase-tag">🎙️ ${pack.linesCount || 0} บท</span>
            ${(pack.characters || []).slice(0, 3).map(c => `<span class="showcase-tag">👤 ${escapeHTML(c)}</span>`).join('')}
          </div>
          <button type="button" class="btn-showcase-create" data-pack-id="${pack.id}">
            ➕ สร้างห้องด้วยฉากนี้
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-showcase-create').forEach(btn => {
      btn.addEventListener('click', () => {
        const packId = btn.dataset.packId;
        openCreateRoomModal(packId);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Rooms Listing, Searching & Filtering
  // --------------------------------------------------------------------------
  async function refreshRoomsList() {
    const grid = document.getElementById('roomsListGrid');
    const countText = document.getElementById('lobbyRoomsCountText');
    if (!grid) return;

    try {
      const data = await apiFetch('/api/rooms');
      cachedRooms = data.rooms || [];
      renderFilteredRooms();
    } catch (err) {
      console.error('Error fetching rooms:', err);
      grid.innerHTML = `
        <div class="rooms-empty-state">
          <p style="color: var(--coral);">ไม่สามารถโหลดรายการห้องได้: ${escapeHTML(err.message)}</p>
          <button type="button" class="btn-lobby-action btn-refresh" id="btnRetryRefresh" style="margin-top: 8px;">🔄 ลองใหม่อีกครั้ง</button>
        </div>
      `;
      const btnRetry = document.getElementById('btnRetryRefresh');
      if (btnRetry) btnRetry.addEventListener('click', refreshRoomsList);
    }
  }

  function renderFilteredRooms() {
    const grid = document.getElementById('roomsListGrid');
    const countText = document.getElementById('lobbyRoomsCountText');
    if (!grid) return;

    let filtered = cachedRooms.slice();

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        (r.packTitle && r.packTitle.toLowerCase().includes(q))
      );
    }

    // 2. Chip Status Filter
    if (currentFilter === 'waiting') {
      filtered = filtered.filter(r => r.status === 'waiting');
    } else if (currentFilter === 'recording') {
      filtered = filtered.filter(r => r.status === 'recording');
    } else if (currentFilter === 'public') {
      filtered = filtered.filter(r => !r.hasPassword);
    } else if (currentFilter === 'private') {
      filtered = filtered.filter(r => r.hasPassword);
    }

    if (countText) {
      countText.textContent = `${filtered.length} ห้องกำลังเปิดรับผู้เล่น (ทั้งหมด ${cachedRooms.length} ห้อง)`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="rooms-empty-state">
          <div class="rooms-empty-icon">🎙️</div>
          <h3>${cachedRooms.length === 0 ? 'ยังไม่มีห้องพากษ์เสียงที่เปิดอยู่ตอนนี้' : 'ไม่พบห้องที่ตรงกับเงื่อนไขการค้นหา'}</h3>
          <p>${cachedRooms.length === 0 ? 'มากดเป็น Host สร้างห้องแรก แล้วชวนเพื่อนๆ มาร่วมพากษ์เสียงฉากสนุกๆ ด้วยกันเลย!' : 'ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองดูนะ'}</p>
          <button type="button" class="btn-lobby-action btn-create-room" id="btnEmptyCreateRoom">
            ➕ สร้างห้องใหม่ทันที
          </button>
        </div>
      `;
      const btnEmpty = document.getElementById('btnEmptyCreateRoom');
      if (btnEmpty) btnEmpty.addEventListener('click', () => openCreateRoomModal());
      return;
    }

    grid.innerHTML = filtered.map(room => {
      const isWaiting = room.status === 'waiting';
      const statusClass = isWaiting ? 'is-waiting' : 'is-recording';
      const statusText = isWaiting ? '🟡 รอผู้เล่นในล็อบบี้' : (room.status === 'recording' ? '🔴 กำลังพากษ์เสียง' : '🟢 จบแล้ว');
      const lockText = room.hasPassword ? '🔒 มีรหัสผ่าน' : '🔓 สาธารณะ';
      const players = room.players || [];
      const host = players.find(p => p.isHost);

      return `
        <div class="room-card" data-code="${room.code}">
          <div>
            <div class="room-card-head">
              <div class="room-card-title-box">
                <h3 class="room-card-title">${escapeHTML(room.name)}</h3>
                <span class="room-card-code-pill">รหัส: <strong>${room.code}</strong></span>
              </div>
              <div class="room-card-badges">
                <span class="room-status-badge ${statusClass}">${statusText}</span>
                <span class="room-lock-pill">${lockText}</span>
              </div>
            </div>

            <div class="room-pack-banner" style="margin-top: 12px;">
              <span class="room-pack-icon">🎬</span>
              <div class="room-pack-text">
                <span class="room-pack-title">${escapeHTML(room.packTitle || 'Scene Pack')}</span>
                <span class="room-pack-meta">${room.lineCount || 0} บทพากษ์</span>
              </div>
            </div>

            <div class="room-players-preview" style="margin-top: 12px;">
              <div class="room-players-count">
                <span>👥 สมาชิกในห้อง (${players.length} คน)</span>
                ${host ? `<span style="color: var(--amber); font-size: 0.72rem;">👑 Host: ${escapeHTML(host.name)}</span>` : ''}
              </div>
              <div class="room-players-tags">
                ${players.slice(0, 5).map(p => `
                  <span class="player-tag ${p.isHost ? 'is-host' : ''}">
                    ${p.isHost ? '👑' : '👤'} ${escapeHTML(p.name)}
                  </span>
                `).join('')}
                ${players.length > 5 ? `<span class="player-tag">+${players.length - 5}</span>` : ''}
              </div>
            </div>
          </div>

          <button type="button" class="btn-join-room ${room.hasPassword ? 'is-locked' : ''}" 
                  data-code="${room.code}" 
                  data-has-password="${room.hasPassword}" 
                  data-room-name="${escapeHTML(room.name)}" 
                  data-pack-title="${escapeHTML(room.packTitle || '')}">
            ${room.hasPassword ? '🔑 ใส่รหัสเพื่อเข้าห้อง' : '👉 เข้าห้อง (Join Room)'}
          </button>
        </div>
      `;
    }).join('');

    // Attach click listeners to Join buttons
    grid.querySelectorAll('.btn-join-room').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        const hasPassword = btn.dataset.hasPassword === 'true';
        const roomName = btn.dataset.roomName;
        const packTitle = btn.dataset.packTitle;
        handleJoinClick({ code, hasPassword, roomName, packTitle });
      });
    });
  }

  // --------------------------------------------------------------------------
  // Create Room Flow
  // --------------------------------------------------------------------------
  async function openCreateRoomModal(preselectPackId = null) {
    const modal = document.getElementById('createRoomModal');
    if (!modal) return;

    // Prefill player name
    const inputName = document.getElementById('inputHostName');
    if (inputName) inputName.value = getStoredPlayerName();

    // Default room name suggestion
    const inputRoom = document.getElementById('inputRoomName');
    if (inputRoom && !inputRoom.value) {
      inputRoom.value = `ห้องพากษ์ของ ${getStoredPlayerName()}`;
    }

    const errEl = document.getElementById('createRoomError');
    if (errEl) errEl.style.display = 'none';

    // Populate packs
    if (availablePacks.length === 0) {
      await fetchPacks();
    }

    const selectPack = document.getElementById('selectRoomPack');
    const cardsGrid = document.getElementById('createPackCardsGrid');

    if (selectPack) {
      selectPack.innerHTML = `
        <option value="">-- เลือก Scene Pack ที่จะเล่น --</option>
        ${availablePacks.map(p => `
          <option value="${p.id}" data-title="${escapeHTML(p.title)}" data-lines="${p.linesCount || 0}">
            🎬 ${p.title} (${p.linesCount || 0} บท)
          </option>
        `).join('')}
      `;

      const targetPackId = preselectPackId || (availablePacks[0] ? availablePacks[0].id : '');
      selectPack.value = targetPackId;

      // Render Visual Selection Cards
      if (cardsGrid) {
        cardsGrid.innerHTML = availablePacks.map(p => `
          <div class="pack-select-card ${p.id === targetPackId ? 'is-selected' : ''}" data-pack-id="${p.id}">
            <strong>🎬 ${escapeHTML(p.title)}</strong>
            <small>${p.linesCount || 0} บท • ${(p.characters || []).join(', ') || 'ตัวละคร'}</small>
          </div>
        `).join('');

        cardsGrid.querySelectorAll('.pack-select-card').forEach(card => {
          card.addEventListener('click', () => {
            cardsGrid.querySelectorAll('.pack-select-card').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
            selectPack.value = card.dataset.packId;
          });
        });
      }

      selectPack.onchange = () => {
        if (cardsGrid) {
          cardsGrid.querySelectorAll('.pack-select-card').forEach(c => {
            c.classList.toggle('is-selected', c.dataset.packId === selectPack.value);
          });
        }
      };
    }

    modal.showModal();
  }

  async function handleCreateRoomSubmit(e) {
    e.preventDefault();
    const hostName = document.getElementById('inputHostName').value.trim();
    const roomName = document.getElementById('inputRoomName').value.trim();
    const packSelect = document.getElementById('selectRoomPack');
    const password = document.getElementById('inputRoomPassword').value.trim();
    const errEl = document.getElementById('createRoomError');

    if (!hostName || !roomName || !packSelect.value) {
      if (errEl) {
        errEl.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
        errEl.style.display = 'block';
      }
      return;
    }

    setStoredPlayerName(hostName);

    const selectedOption = packSelect.options[packSelect.selectedIndex];
    const packTitle = selectedOption.dataset.title || '';
    const lineCount = Number(selectedOption.dataset.lines) || 1;

    try {
      const res = await apiFetch('/api/rooms', {
        method: 'POST',
        body: {
          playerName: hostName,
          roomName: roomName,
          packId: packSelect.value,
          packTitle: packTitle,
          lineCount: lineCount,
          password: password || undefined
        }
      });

      if (res.token && res.state) {
        roomToken = res.token;
        setRoomToken(res.state.code, res.token);
        currentRoom = res.state;

        document.getElementById('createRoomModal').close();
        enterWaitingRoom(currentRoom);
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'ไม่สามารถสร้างห้องได้';
        errEl.style.display = 'block';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Join Room Flow
  // --------------------------------------------------------------------------
  function handleJoinClick({ code, hasPassword, roomName, packTitle }) {
    const modal = document.getElementById('joinRoomModal');
    if (!modal) return;

    document.getElementById('joinRoomCode').value = code;
    document.getElementById('joinPreviewCode').textContent = code;
    document.getElementById('joinPreviewRoomName').textContent = roomName;
    document.getElementById('joinPreviewPackTitle').textContent = `Scene: ${packTitle}`;

    const passGroup = document.getElementById('joinPasswordGroup');
    const lockBadge = document.getElementById('joinLockBadge');
    const passInput = document.getElementById('inputJoinPassword');
    const errEl = document.getElementById('joinRoomError');

    if (errEl) errEl.style.display = 'none';

    const inputName = document.getElementById('inputJoinPlayerName');
    if (inputName) inputName.value = getStoredPlayerName();

    if (hasPassword) {
      if (passGroup) passGroup.style.display = 'flex';
      if (lockBadge) lockBadge.textContent = '🔒 ต้องใช้รหัสผ่าน';
      if (passInput) {
        passInput.required = true;
        passInput.value = '';
      }
    } else {
      if (passGroup) passGroup.style.display = 'none';
      if (lockBadge) lockBadge.textContent = '🔓 ห้องสาธารณะ';
      if (passInput) {
        passInput.required = false;
        passInput.value = '';
      }
    }

    modal.showModal();
  }

  async function handleJoinSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('joinRoomCode').value;
    const playerName = document.getElementById('inputJoinPlayerName').value.trim();
    const passInput = document.getElementById('inputJoinPassword');
    const password = passInput ? passInput.value.trim() : '';
    const errEl = document.getElementById('joinRoomError');

    if (!playerName) {
      if (errEl) {
        errEl.textContent = 'กรุณากรอกชื่อของคุณ';
        errEl.style.display = 'block';
      }
      return;
    }

    setStoredPlayerName(playerName);

    try {
      const res = await apiFetch(`/api/rooms/${code}`, {
        method: 'POST',
        body: {
          action: 'join',
          playerName: playerName,
          password: password || undefined
        }
      });

      if (res.token && res.state) {
        roomToken = res.token;
        setRoomToken(res.state.code, res.token);
        currentRoom = res.state;

        document.getElementById('joinRoomModal').close();

        if (currentRoom.status === 'recording') {
          enterGameScreen(currentRoom);
        } else {
          enterWaitingRoom(currentRoom);
        }
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'ไม่สามารถเข้าห้องได้';
        errEl.style.display = 'block';
      }
    }
  }

  // --------------------------------------------------------------------------
  // VIEW 2: Waiting Room Screen
  // --------------------------------------------------------------------------
  function enterWaitingRoom(room) {
    currentRoom = room;
    switchView('waiting');
    updateWaitingRoomUI(room);
    startRoomPolling(room.code);
  }

  function updateWaitingRoomUI(room) {
    currentRoom = room;

    const titleEl = document.getElementById('waitingRoomTitle');
    const codeEl = document.getElementById('waitingRoomCode');
    const packTagEl = document.getElementById('waitingRoomPackTitle');
    const lockBadge = document.getElementById('waitingRoomLockBadge');

    const packNameEl = document.getElementById('waitingPackName');
    const packDescEl = document.getElementById('waitingPackDesc');
    const packTagsEl = document.getElementById('waitingPackTags');

    const countEl = document.getElementById('waitingPlayerCountNum');
    const listEl = document.getElementById('waitingPlayersList');

    const hostBox = document.getElementById('waitingHostBox');
    const guestBox = document.getElementById('waitingGuestBox');

    if (titleEl) titleEl.textContent = room.name || `Room ${room.code}`;
    if (codeEl) codeEl.textContent = room.code;
    if (packTagEl) packTagEl.textContent = `🎬 Scene Pack: ${room.pack?.title || 'Voice Pack'}`;
    if (lockBadge) lockBadge.textContent = room.hasPassword ? '🔒 มีรหัสผ่าน' : '🔓 ห้องสาธารณะ';

    if (packNameEl) packNameEl.textContent = room.pack?.title || 'Scene Pack';
    if (packDescEl) packDescEl.textContent = room.pack?.description || 'ร่วมพากษ์บทสนทนาสนุกๆ';
    if (packTagsEl) {
      const chars = room.pack?.characters || [];
      packTagsEl.innerHTML = `
        <span class="showcase-tag">🎙️ ${room.pack?.lineCount || room.lineCount || 0} บท</span>
        ${chars.map(c => `<span class="showcase-tag">👤 ${escapeHTML(c)}</span>`).join('')}
      `;
    }

    const isHost = Boolean(room.you?.isHost);
    if (hostBox) hostBox.style.display = isHost ? 'flex' : 'none';
    if (guestBox) guestBox.style.display = isHost ? 'none' : 'flex';

    const players = room.players || [];
    if (countEl) countEl.textContent = players.length;

    if (listEl) {
      listEl.innerHTML = players.map((p, idx) => {
        const isYou = p.id === room.you?.id;
        const turnNum = p.turnNumber || (idx + 1);

        return `
          <li class="waiting-player-item">
            <span class="player-turn-num">#${turnNum}</span>
            <span class="player-name-text">${escapeHTML(p.name)}</span>
            ${p.isHost ? '<span class="player-role-badge is-host">👑 Host</span>' : ''}
            ${isYou ? '<span class="player-role-badge is-you">คุณ</span>' : ''}
          </li>
        `;
      }).join('');
    }

    // Automatically transition to game view when host starts the game!
    if (room.status === 'recording') {
      enterGameScreen(room);
    }
  }

  // --------------------------------------------------------------------------
  // Host Start Game
  // --------------------------------------------------------------------------
  async function handleHostStartGame() {
    if (!currentRoom) return;

    try {
      const res = await apiFetch(`/api/rooms/${currentRoom.code}`, {
        method: 'POST',
        body: { action: 'start' }
      });
      if (res.state) {
        currentRoom = res.state;
        enterGameScreen(currentRoom);
      }
    } catch (err) {
      alert('ไม่สามารถเริ่มเกมได้: ' + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // VIEW 3: Game Screen (In-Game Dubbing & Turns)
  // --------------------------------------------------------------------------
  async function enterGameScreen(room) {
    currentRoom = room;
    switchView('game');

    // Auto-load pack for room if needed
    loadPackForRoom(room.pack);

    updateInGameTurnBar(room);
    startRoomPolling(room.code);
  }

  async function loadPackForRoom(packInfo) {
    if (!packInfo) return;
    if (window.VoicePackSelector && typeof window.VoicePackSelector.selectAndLoadPack === 'function') {
      const curPackId = window.VoicePackSelector.getActivePackId ? window.VoicePackSelector.getActivePackId() : null;
      if (curPackId !== packInfo.id) {
        const packs = window.VoicePackSelector.getAvailablePacks ? window.VoicePackSelector.getAvailablePacks() : availablePacks;
        const target = packs.find(p => p.id === packInfo.id || p.title === packInfo.title);
        if (target) {
          console.log('Loading voice pack for multiplayer room:', target.title);
          window.VoicePackSelector.selectAndLoadPack(target);
        }
      }
    }
  }

  function updateInGameTurnBar(room) {
    currentRoom = room;

    const roomTitle = document.getElementById('ingameRoomTitle');
    const roomCode = document.getElementById('ingameRoomCode');
    const packTitle = document.getElementById('ingamePackTitle');
    const track = document.getElementById('ingameTurnTrack');
    const banner = document.getElementById('turnActionBanner');
    const iconEl = document.getElementById('turnStatusIcon');
    const headEl = document.getElementById('turnStatusHeadline');
    const subEl = document.getElementById('turnStatusSub');
    const btnPass = document.getElementById('btnPassTurn');
    const btnNext = document.getElementById('btnNextTurn');

    if (roomTitle) roomTitle.textContent = room.name || 'ห้องพากษ์';
    if (roomCode) roomCode.textContent = room.code;
    if (packTitle) packTitle.textContent = room.pack?.title || 'Scene Pack';

    const currentTurnId = room.currentTurnPlayerId;
    const you = room.you;
    const isYourTurn = you && you.id === currentTurnId;
    const currentTurnPlayer = (room.players || []).find(p => p.id === currentTurnId);

    // Render Turn Track
    if (track) {
      track.innerHTML = (room.players || []).map((p, idx) => {
        const isActive = p.id === currentTurnId;
        const isYou = p.id === you?.id;
        const turnNum = p.turnNumber || (idx + 1);

        return `
          <div class="turn-pill ${isActive ? 'is-active-turn' : ''}">
            <span style="font-weight: 700; color: var(--cyan);">#${turnNum}</span>
            <span>${escapeHTML(p.name)} ${isYou ? '(คุณ)' : ''}</span>
            ${isActive ? '<span style="color: var(--amber);">🎙️ <b>กำลังพากษ์</b></span>' : ''}
          </div>
        `;
      }).join('<span style="color: var(--muted); font-size: 0.8rem; margin: 0 4px;">➔</span>');
    }

    // Turn Action Banner
    if (banner) {
      if (isYourTurn) {
        banner.style.borderColor = 'var(--amber)';
        banner.style.background = 'oklch(20% 0.03 83)';
        if (iconEl) iconEl.textContent = '🌟';
        if (headEl) headEl.innerHTML = '<span style="color: var(--amber);">🎉 ถึงคิวของคุณพากษ์แล้ว!</span> (Your Turn)';
        if (subEl) subEl.textContent = 'กดปุ่มอัดเสียงด้านล่างเพื่อบันทึกเสียงบทนี้ หรือกดส่งให้เพื่อนคนอื่นพากษ์แทน';
        if (btnPass) btnPass.style.display = 'inline-flex';
        if (btnNext) btnNext.style.display = 'inline-flex';
      } else {
        banner.style.borderColor = 'oklch(30% 0.015 190)';
        banner.style.background = 'oklch(18% 0.015 190)';
        if (iconEl) iconEl.textContent = '👀';
        const activeName = currentTurnPlayer ? currentTurnPlayer.name : 'ผู้เล่นอื่น';
        if (headEl) headEl.textContent = `กำลังรอคิวของ: ${activeName}`;
        if (subEl) subEl.textContent = 'ระบบจะส่งเสียงและแจ้งเตือนทันทีเมื่อถึงคิวของคุณ';
        // If host, keep buttons available for emergency turn skipping
        if (you?.isHost) {
          if (btnPass) btnPass.style.display = 'inline-flex';
          if (btnNext) btnNext.style.display = 'inline-flex';
        } else {
          if (btnPass) btnPass.style.display = 'none';
          if (btnNext) btnNext.style.display = 'none';
        }
      }
    }

    // Check for toast notification on turn pass
    if (room.lastTurnPass && room.lastTurnPass.timestamp > lastNotifiedPassTime) {
      lastNotifiedPassTime = room.lastTurnPass.timestamp;
      showTurnPassToast(`${room.lastTurnPass.fromName} ได้ส่งคิวพากษ์ให้ ${room.lastTurnPass.toName} แล้ว! 🎤`);
    }
  }

  function showTurnPassToast(message) {
    const existing = document.querySelector('.turn-pass-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'turn-pass-toast';
    toast.innerHTML = `<span>🔄</span> <span>${escapeHTML(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // Pass Turn Menu & Action
  // --------------------------------------------------------------------------
  function openPassTurnPopover(btnElement) {
    if (activePassPopover) {
      activePassPopover.remove();
      activePassPopover = null;
      return;
    }

    if (!currentRoom || !currentRoom.players) return;

    const otherPlayers = currentRoom.players.filter(p => p.id !== currentRoom.currentTurnPlayerId);
    if (otherPlayers.length === 0) {
      alert('ไม่มีผู้เล่นคนอื่นในห้องให้ส่งคิวพากษ์');
      return;
    }

    const popover = document.createElement('div');
    popover.className = 'pass-turn-popover';
    popover.innerHTML = `
      <div style="font-size: 0.72rem; font-weight: 700; color: var(--muted); padding: 4px 8px; text-transform: uppercase;">
        เลือกผู้เล่นที่ต้องการส่งคิวให้:
      </div>
      ${otherPlayers.map(p => `
        <button type="button" class="pass-turn-item" data-id="${p.id}">
          <span>👤 ${escapeHTML(p.name)}</span>
          <small style="color: var(--amber);">#${p.turnNumber || ''}</small>
        </button>
      `).join('')}
    `;

    const rect = btnElement.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
    popover.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(popover);
    activePassPopover = popover;

    popover.querySelectorAll('.pass-turn-item').forEach(item => {
      item.addEventListener('click', async () => {
        const targetId = item.dataset.id;
        popover.remove();
        activePassPopover = null;
        await executePassTurn(targetId);
      });
    });

    setTimeout(() => {
      const clickHandler = (e) => {
        if (!popover.contains(e.target) && e.target !== btnElement) {
          popover.remove();
          activePassPopover = null;
          document.removeEventListener('click', clickHandler);
        }
      };
      document.addEventListener('click', clickHandler);
    }, 10);
  }

  async function executePassTurn(targetPlayerId) {
    if (!currentRoom) return;
    try {
      const res = await apiFetch(`/api/rooms/${currentRoom.code}`, {
        method: 'POST',
        body: { action: 'pass-turn', targetPlayerId }
      });
      if (res.state) {
        updateInGameTurnBar(res.state);
      }
    } catch (err) {
      alert('ไม่สามารถส่งคิวได้: ' + err.message);
    }
  }

  async function executeNextTurn() {
    if (!currentRoom) return;
    try {
      const res = await apiFetch(`/api/rooms/${currentRoom.code}`, {
        method: 'POST',
        body: { action: 'next-turn' }
      });
      if (res.state) {
        updateInGameTurnBar(res.state);
      }
    } catch (err) {
      alert('ไม่สามารถเปลี่ยนคิวได้: ' + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // Leave Room & Back to Home
  // --------------------------------------------------------------------------
  async function handleLeaveRoom() {
    if (!currentRoom) {
      switchView('home');
      return;
    }
    if (!confirm('คุณต้องการออกจากห้องพากษ์เสียงนี้ใช่หรือไม่?')) return;

    try {
      await apiFetch(`/api/rooms/${currentRoom.code}`, {
        method: 'POST',
        body: { action: 'leave' }
      });
    } catch (err) {
      console.warn('Error on leave:', err);
    }

    const code = currentRoom.code;
    clearRoomSession(code);
    stopRoomPolling();

    switchView('home');
    refreshRoomsList();
  }

  // --------------------------------------------------------------------------
  // Polling Sync Engine
  // --------------------------------------------------------------------------
  function startRoomPolling(code) {
    stopRoomPolling();
    pollTimer = setInterval(async () => {
      if (!currentRoom || !roomToken) {
        stopRoomPolling();
        return;
      }
      try {
        const res = await apiFetch(`/api/rooms/${code}`);
        if (res.state) {
          currentRoom = res.state;
          const waitingView = document.getElementById('viewWaitingRoom');
          if (waitingView && waitingView.style.display !== 'none') {
            updateWaitingRoomUI(res.state);
          }
          const turnBar = document.getElementById('inGameTurnBar');
          if (turnBar && turnBar.style.display !== 'none') {
            updateInGameTurnBar(res.state);
          }
        }
      } catch (err) {
        console.warn('Poll error for room:', err);
      }
    }, 1500);
  }

  function stopRoomPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Check Existing Session on Refresh
  // --------------------------------------------------------------------------
  async function checkExistingSession() {
    const code = localStorage.getItem(LS_ROOM_CODE);
    const token = code ? getRoomToken(code) : null;

    if (code && token) {
      roomToken = token;
      try {
        const res = await apiFetch(`/api/rooms/${code}`);
        if (res.state) {
          currentRoom = res.state;
          if (res.state.status === 'recording') {
            enterGameScreen(res.state);
          } else {
            enterWaitingRoom(res.state);
          }
          return;
        }
      } catch (err) {
        console.warn('Previous room session expired or invalid:', err);
        clearRoomSession(code);
      }
    }

    // Default to Home View
    switchView('home');
  }

  // Helper
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --------------------------------------------------------------------------
  // Initialization & Event Bindings
  // --------------------------------------------------------------------------
  function init() {
    updateTopbarPlayerName();

    // 1. Check Session & Load
    checkExistingSession();
    fetchPacks();
    refreshRoomsList();

    // Periodic lobby refresh every 6s on home view
    setInterval(() => {
      const homeView = document.getElementById('viewHomeLobby');
      if (homeView && homeView.style.display !== 'none') {
        refreshRoomsList();
      }
    }, 6000);

    // 2. Topbar Bindings
    const btnTopCreate = document.getElementById('btnTopCreateRoom');
    if (btnTopCreate) btnTopCreate.addEventListener('click', () => openCreateRoomModal());

    const btnEditPlayer = document.getElementById('btnEditPlayerName');
    if (btnEditPlayer) {
      btnEditPlayer.addEventListener('click', () => {
        const modal = document.getElementById('editNameModal');
        const input = document.getElementById('inputNewPlayerName');
        if (modal && input) {
          input.value = getStoredPlayerName();
          modal.showModal();
        }
      });
    }

    const formEditName = document.getElementById('editNameForm');
    if (formEditName) {
      formEditName.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('inputNewPlayerName');
        if (input && input.value.trim()) {
          setStoredPlayerName(input.value.trim());
          document.getElementById('editNameModal').close();
        }
      });
    }

    const btnCloseEditName = document.getElementById('btnCloseEditNameModal');
    if (btnCloseEditName) btnCloseEditName.addEventListener('click', () => document.getElementById('editNameModal').close());

    const btnCancelEditName = document.getElementById('btnCancelEditNameModal');
    if (btnCancelEditName) btnCancelEditName.addEventListener('click', () => document.getElementById('editNameModal').close());

    // 3. Search & Filter Bar
    const searchInput = document.getElementById('inputLobbySearch');
    const btnClearSearch = document.getElementById('btnClearLobbySearch');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = searchQuery ? 'inline-block' : 'none';
        renderFilteredRooms();
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        btnClearSearch.style.display = 'none';
        renderFilteredRooms();
      });
    }

    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        currentFilter = chip.dataset.filter || 'all';
        renderFilteredRooms();
      });
    });

    const btnOpenCreate = document.getElementById('btnOpenCreateRoom');
    if (btnOpenCreate) btnOpenCreate.addEventListener('click', () => openCreateRoomModal());

    const btnRefresh = document.getElementById('btnRefreshLobby');
    if (btnRefresh) btnRefresh.addEventListener('click', refreshRoomsList);

    // 4. Create Room Modal
    const btnCloseCreate = document.getElementById('btnCloseCreateModal');
    if (btnCloseCreate) btnCloseCreate.addEventListener('click', () => document.getElementById('createRoomModal').close());

    const btnCancelCreate = document.getElementById('btnCancelCreateModal');
    if (btnCancelCreate) btnCancelCreate.addEventListener('click', () => document.getElementById('createRoomModal').close());

    const formCreate = document.getElementById('createRoomForm');
    if (formCreate) formCreate.addEventListener('submit', handleCreateRoomSubmit);

    // 5. Join Room Modal
    const btnCloseJoin = document.getElementById('btnCloseJoinModal');
    if (btnCloseJoin) btnCloseJoin.addEventListener('click', () => document.getElementById('joinRoomModal').close());

    const btnCancelJoin = document.getElementById('btnCancelJoinModal');
    if (btnCancelJoin) btnCancelJoin.addEventListener('click', () => document.getElementById('joinRoomModal').close());

    const formJoin = document.getElementById('joinRoomForm');
    if (formJoin) formJoin.addEventListener('submit', handleJoinSubmit);

    // 6. Waiting Room View
    const btnWaitingLeave = document.getElementById('btnWaitingLeave');
    if (btnWaitingLeave) btnWaitingLeave.addEventListener('click', handleLeaveRoom);

    const btnHostStart = document.getElementById('btnHostStartGame');
    if (btnHostStart) btnHostStart.addEventListener('click', handleHostStartGame);

    const btnCopyCode = document.getElementById('btnWaitingCopyCode');
    if (btnCopyCode) {
      btnCopyCode.addEventListener('click', () => {
        if (currentRoom?.code) {
          navigator.clipboard.writeText(currentRoom.code).then(() => {
            alert(`คัดลอกรหัสห้อง ${currentRoom.code} แล้ว!`);
          });
        }
      });
    }

    const btnCopyLink = document.getElementById('btnWaitingCopyLink');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        if (currentRoom?.code) {
          const url = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
          navigator.clipboard.writeText(url).then(() => {
            alert(`คัดลอกลิงก์ชวนเพื่อนแล้ว:\n${url}`);
          });
        }
      });
    }

    // 7. In-Game Turn Bar
    const btnIngameLeave = document.getElementById('btnIngameLeave');
    if (btnIngameLeave) btnIngameLeave.addEventListener('click', handleLeaveRoom);

    const btnPass = document.getElementById('btnPassTurn');
    if (btnPass) btnPass.addEventListener('click', () => openPassTurnPopover(btnPass));

    const btnNext = document.getElementById('btnNextTurn');
    if (btnNext) btnNext.addEventListener('click', executeNextTurn);

    const btnViewLobby = document.getElementById('btnViewLobbyDetails');
    if (btnViewLobby) {
      btnViewLobby.addEventListener('click', () => {
        if (currentRoom) enterWaitingRoom(currentRoom);
      });
    }

    // 8. Deep-linking URL parameter '?room=CODE'
    const urlParams = new URLSearchParams(window.location.search);
    const joinCodeFromUrl = urlParams.get('room');
    if (joinCodeFromUrl && !currentRoom) {
      apiFetch(`/api/rooms/${joinCodeFromUrl.toUpperCase()}`).then(res => {
        if (res.state) {
          handleJoinClick({
            code: res.state.code,
            hasPassword: res.state.hasPassword,
            roomName: res.state.name,
            packTitle: res.state.pack?.title || ''
          });
        }
      }).catch(err => {
        console.warn('Could not auto-open room from URL:', err);
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
