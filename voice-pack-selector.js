/**
 * Voice Pack Selector Module
 * Manages list-based Voice Pack selection from web-hosted .zip files.
 */
(() => {
  'use strict';

  let availablePacks = [];
  let isLoadingPack = false;
  let activePackId = null;

  const SELECTOR_DIALOG_ID = 'voicePackDialog';

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

  // Format bytes helper
  function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Fetch packs from server API
  async function fetchPacks() {
    try {
      const res = await fetch('/api/packs', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.packs) && data.packs.length > 0) {
          availablePacks = data.packs;
          return availablePacks;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch voice packs from server, using fallback packs:', err);
    }
    availablePacks = BUILTIN_DEFAULT_PACKS;
    return availablePacks;
  }

  // Load a pack by fetching its ZIP and importing it
  async function selectAndLoadPack(packInfo, onProgress) {
    if (isLoadingPack) return;
    isLoadingPack = true;
    updateUiLoadingState(true, packInfo);

    try {
      if (typeof onProgress === 'function') onProgress('Downloading ZIP...');
      if (window.toast) window.toast(`Loading ${packInfo.title}...`);

      const res = await fetch(packInfo.url);
      if (!res.ok) throw new Error(`Failed to download ${packInfo.filename} (status ${res.status})`);

      const totalBytes = Number(res.headers.get('content-length')) || packInfo.size || 0;
      let blob;

      if (res.body && window.ReadableStream && totalBytes > 0) {
        const reader = res.body.getReader();
        let receivedBytes = 0;
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedBytes += value.length;
          const pct = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          if (typeof onProgress === 'function') {
            onProgress(`Downloading ZIP: ${pct}%`);
          }
        }
        blob = new Blob(chunks, { type: 'application/zip' });
      } else {
        blob = await res.blob();
      }

      if (typeof onProgress === 'function') onProgress('Unpacking Voice Pack...');

      const file = new File([blob], packInfo.filename, {
        type: 'application/zip',
        lastModified: packInfo.updatedAt || Date.now()
      });

      if (typeof window.importSelectedZip === 'function') {
        await window.importSelectedZip(file);
      } else {
        // Fallback: wait a moment for app.js to initialize
        let retries = 10;
        while (retries > 0 && typeof window.importSelectedZip !== 'function') {
          await new Promise(r => setTimeout(r, 200));
          retries--;
        }
        if (typeof window.importSelectedZip === 'function') {
          await window.importSelectedZip(file);
        } else {
          throw new Error('Pack importer is not ready yet. Please try again.');
        }
      }

      activePackId = packInfo.id;
      syncPackSelectDropdown();
      renderDialogPackList();
      renderTapeShelfWebPacks();
      syncMultiplayerWebPackSelect();

      // Close modal if open
      closePackDialog();

      if (window.toast) {
        window.toast(`Loaded "${packInfo.title}" successfully!`);
      }
    } catch (err) {
      console.error('Error loading voice pack:', err);
      if (window.toast) {
        window.toast(`Could not load pack: ${err.message}`);
      } else {
        alert(`Could not load pack: ${err.message}`);
      }
    } finally {
      isLoadingPack = false;
      updateUiLoadingState(false);
    }
  }

  // Populate header #packSelect dropdown
  function syncPackSelectDropdown() {
    const select = document.getElementById('packSelect');
    if (!select) return;

    // Check currently loaded pack
    const currentTitleElem = document.getElementById('packTitle');
    const currentTitle = currentTitleElem ? currentTitleElem.textContent.trim() : '';

    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = currentTitle && currentTitle !== 'No pack loaded'
      ? `Current: ${currentTitle}`
      : 'Select a Voice Pack (.zip)...';
    select.appendChild(defaultOpt);

    const group = document.createElement('optgroup');
    group.label = 'Web Voice Packs (.zip)';

    availablePacks.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.url;
      opt.dataset.packId = p.id;
      opt.textContent = `${p.title} (${p.filename})`;
      if (p.id === activePackId || (currentTitle && p.title.toLowerCase() === currentTitle.toLowerCase())) {
        opt.selected = true;
      }
      group.appendChild(opt);
    });

    select.appendChild(group);

    const customOpt = document.createElement('option');
    customOpt.value = '__browse__';
    customOpt.textContent = 'Browse Voice Packs...';
    select.appendChild(customOpt);
  }

  // Handle header #packSelect change
  function handlePackSelectChange(e) {
    const val = e.target.value;
    if (!val) return;

    if (val === '__browse__') {
      openPackDialog();
      syncPackSelectDropdown();
      return;
    }

    const pack = availablePacks.find(p => p.url === val);
    if (pack) {
      selectAndLoadPack(pack);
    }
  }

  // Update loading states in UI
  function updateUiLoadingState(loading, packInfo = null) {
    const dialog = document.getElementById(SELECTOR_DIALOG_ID);
    if (dialog) {
      const loadBtns = dialog.querySelectorAll('.pack-card-load-btn');
      loadBtns.forEach(btn => {
        btn.disabled = loading;
        if (loading && packInfo && btn.dataset.packId === packInfo.id) {
          btn.textContent = 'Loading...';
        } else if (!loading) {
          btn.textContent = (btn.dataset.packId === activePackId) ? 'Active' : 'Load Pack';
        }
      });
    }

    const headerSelect = document.getElementById('packSelect');
    if (headerSelect) {
      headerSelect.disabled = loading;
    }

    const screenBtn = document.getElementById('screenImportButton');
    if (screenBtn) {
      screenBtn.disabled = loading;
      if (loading) {
        screenBtn.textContent = 'Loading Voice Pack...';
      } else {
        screenBtn.textContent = 'Select a Voice Pack';
      }
    }

    // Multiplayer UI loading states
    const mpSelect = document.getElementById('multiplayerWebPackSelect');
    if (mpSelect) mpSelect.disabled = loading;

    const mpChooseBtn = document.getElementById('multiplayerChoosePack');
    if (mpChooseBtn) {
      mpChooseBtn.disabled = loading;
      mpChooseBtn.textContent = loading ? 'Loading...' : 'Select Pack';
    }

    const mpRoomImport = document.getElementById('multiplayerRoomPackImport');
    if (mpRoomImport) {
      mpRoomImport.disabled = loading;
      mpRoomImport.textContent = loading ? 'Loading...' : 'Select Pack';
    }

    const mpCreateBtn = document.getElementById('multiplayerCreate');
    if (mpCreateBtn && loading) {
      mpCreateBtn.disabled = true;
    }

    const mpPackDetail = document.getElementById('multiplayerPackDetail');
    if (mpPackDetail && loading) {
      mpPackDetail.textContent = packInfo ? `Loading "${packInfo.title}"...` : 'Loading voice pack...';
    }
  }

  // Create the modal dialog if not already in DOM
  function ensureDialogExists() {
    let dialog = document.getElementById(SELECTOR_DIALOG_ID);
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = SELECTOR_DIALOG_ID;
    dialog.className = 'voice-pack-modal';
    dialog.setAttribute('aria-labelledby', 'voicePackModalTitle');

    dialog.innerHTML = `
      <div class="vpm-container">
        <div class="vpm-header">
          <div>
            <span class="vpm-tag">WEB VOICE PACKS (.ZIP)</span>
            <h2 id="voicePackModalTitle" class="vpm-title">Select Voice Pack</h2>
            <p class="vpm-subtitle">Choose a pre-hosted voice pack to start dubbing instantly.</p>
          </div>
          <button type="button" class="vpm-close-btn" id="vpmCloseBtn" aria-label="Close dialog">&times;</button>
        </div>

        <div class="vpm-toolbar">
          <div class="vpm-search-wrap">
            <svg class="vpm-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="vpmSearchInput" class="vpm-search-input" placeholder="Search by title, filename, or character..." />
          </div>
          <button type="button" class="vpm-refresh-btn" id="vpmRefreshBtn" title="Refresh pack list">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <div class="vpm-list-wrap">
          <div id="vpmPackList" class="vpm-pack-list">
            <div class="vpm-loading">Loading available packs...</div>
          </div>
        </div>

        <div class="vpm-upload-section">
          <div class="vpm-upload-header">
            <strong>Upload New .zip Pack to Web</strong>
            <small>Stored in /packs/ on the web server for immediate selection</small>
          </div>
          <div class="vpm-upload-row">
            <input type="file" id="vpmFileInput" accept=".zip" class="vpm-file-input" />
            <button type="button" id="vpmUploadBtn" class="vpm-upload-btn">Upload .ZIP</button>
          </div>
          <div id="vpmUploadStatus" class="vpm-upload-status"></div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Event listeners
    const closeBtn = dialog.querySelector('#vpmCloseBtn');
    closeBtn.addEventListener('click', closePackDialog);

    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) closePackDialog();
    });

    const searchInput = dialog.querySelector('#vpmSearchInput');
    searchInput.addEventListener('input', () => {
      renderDialogPackList(searchInput.value);
    });

    const refreshBtn = dialog.querySelector('#vpmRefreshBtn');
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('is-spinning');
      await fetchPacks();
      syncPackSelectDropdown();
      renderDialogPackList(searchInput.value);
      renderTapeShelfWebPacks();
      setTimeout(() => refreshBtn.classList.remove('is-spinning'), 500);
    });

    // Upload handler
    const uploadBtn = dialog.querySelector('#vpmUploadBtn');
    const fileInput = dialog.querySelector('#vpmFileInput');
    const uploadStatus = dialog.querySelector('#vpmUploadStatus');

    uploadBtn.addEventListener('click', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        uploadStatus.textContent = 'Please choose a .zip file first.';
        uploadStatus.className = 'vpm-upload-status error';
        return;
      }
      if (!file.name.toLowerCase().endsWith('.zip')) {
        uploadStatus.textContent = 'Only .zip files are allowed.';
        uploadStatus.className = 'vpm-upload-status error';
        return;
      }

      uploadBtn.disabled = true;
      uploadStatus.textContent = `Uploading ${file.name}...`;
      uploadStatus.className = 'vpm-upload-status info';

      try {
        const formData = new FormData();
        formData.append('pack', file);

        const res = await fetch('/api/packs/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        uploadStatus.textContent = `Uploaded "${data.pack.title}" successfully!`;
        uploadStatus.className = 'vpm-upload-status success';
        fileInput.value = '';

        // Refresh pack list
        await fetchPacks();
        syncPackSelectDropdown();
        renderDialogPackList();
        renderTapeShelfWebPacks();

        // Prompt to load uploaded pack
        if (data.pack) {
          selectAndLoadPack(data.pack);
        }
      } catch (err) {
        uploadStatus.textContent = `Upload error: ${err.message}`;
        uploadStatus.className = 'vpm-upload-status error';
      } finally {
        uploadBtn.disabled = false;
      }
    });

    return dialog;
  }

  // Render pack cards inside the modal
  function renderDialogPackList(query = '') {
    const list = document.getElementById('vpmPackList');
    if (!list) return;

    const q = (query || '').trim().toLowerCase();
    const filtered = availablePacks.filter(p => {
      if (!q) return true;
      const titleMatch = (p.title || '').toLowerCase().includes(q);
      const fileMatch = (p.filename || '').toLowerCase().includes(q);
      const descMatch = (p.description || '').toLowerCase().includes(q);
      const charMatch = (p.characters || []).some(c => c.toLowerCase().includes(q));
      return titleMatch || fileMatch || descMatch || charMatch;
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="vpm-empty">
          <p>No voice packs found matching "<strong>${escapeHtml(query)}</strong>".</p>
          <small>Check spelling or upload a new .zip pack below.</small>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(p => {
      const isActive = p.id === activePackId;
      const characters = Array.isArray(p.characters) ? p.characters : [];
      const charHtml = characters.length > 0
        ? `<div class="vpm-characters">${characters.map(c => `<span class="vpm-char-tag">${escapeHtml(c)}</span>`).join('')}</div>`
        : '';

      return `
        <div class="vpm-card ${isActive ? 'is-active' : ''}" data-pack-id="${escapeHtml(p.id)}">
          <div class="vpm-card-top">
            <div class="vpm-card-main">
              <h3 class="vpm-card-title">${escapeHtml(p.title)}</h3>
              <div class="vpm-card-meta">
                <span class="vpm-pill vpm-pill-filename">${escapeHtml(p.filename)}</span>
                <span class="vpm-pill">${p.linesCount} lines</span>
                <span class="vpm-pill">${p.sizeFormatted || formatBytes(p.size)}</span>
              </div>
            </div>
            <button type="button" class="vpm-load-btn pack-card-load-btn ${isActive ? 'is-active' : ''}" data-pack-id="${escapeHtml(p.id)}">
              ${isActive ? 'Active' : 'Select & Load'}
            </button>
          </div>
          ${p.description ? `<p class="vpm-card-desc">${escapeHtml(p.description)}</p>` : ''}
          ${charHtml}
        </div>
      `;
    }).join('');

    // Attach click listeners to load buttons
    list.querySelectorAll('.pack-card-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.packId;
        const pack = availablePacks.find(p => p.id === id);
        if (pack) {
          selectAndLoadPack(pack);
        }
      });
    });
  }

  // Render web packs in the tape shelf section on the main page
  function renderTapeShelfWebPacks() {
    const tapeShelf = document.getElementById('tapeShelf');
    if (!tapeShelf) return;

    let webPacksContainer = document.getElementById('webPacksShelf');
    if (!webPacksContainer) {
      webPacksContainer = document.createElement('div');
      webPacksContainer.id = 'webPacksShelf';
      webPacksContainer.className = 'web-packs-shelf';
      tapeShelf.parentNode.insertBefore(webPacksContainer, tapeShelf);
    }

    if (availablePacks.length === 0) {
      webPacksContainer.innerHTML = '';
      return;
    }

    webPacksContainer.innerHTML = `
      <div class="web-packs-shelf-head">
        <span class="eyebrow">WEB VOICE PACKS (.ZIP)</span>
        <button type="button" id="browseAllWebPacksBtn" class="btn-shelf-browse">Open Pack Selector</button>
      </div>
      <div class="web-packs-tape-grid">
        ${availablePacks.map(p => `
          <div class="web-tape-card ${p.id === activePackId ? 'is-active' : ''}" data-pack-id="${escapeHtml(p.id)}">
            <div class="web-tape-badge">.ZIP</div>
            <div class="web-tape-title">${escapeHtml(p.title)}</div>
            <div class="web-tape-sub">${p.linesCount} lines · ${p.sizeFormatted || formatBytes(p.size)}</div>
            <div class="web-tape-filename">${escapeHtml(p.filename)}</div>
            <button type="button" class="web-tape-btn pack-card-load-btn" data-pack-id="${escapeHtml(p.id)}">
              ${p.id === activePackId ? 'Active' : 'Load Pack'}
            </button>
          </div>
        `).join('')}
      </div>
    `;

    const browseBtn = webPacksContainer.querySelector('#browseAllWebPacksBtn');
    if (browseBtn) {
      browseBtn.addEventListener('click', openPackDialog);
    }

    webPacksContainer.querySelectorAll('.pack-card-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.packId;
        const pack = availablePacks.find(p => p.id === id);
        if (pack) {
          selectAndLoadPack(pack);
        }
      });
    });
  }

  function openPackDialog() {
    const dialog = ensureDialogExists();
    renderDialogPackList();
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closePackDialog() {
    const dialog = document.getElementById(SELECTOR_DIALOG_ID);
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Intercept the TV screen import button so it opens our pack list!
  function wireScreenImportButton() {
    const screenImportBtn = document.getElementById('screenImportButton');
    if (screenImportBtn) {
      screenImportBtn.textContent = 'Select a Voice Pack';
      screenImportBtn.title = 'Choose a voice pack hosted on the web';
      screenImportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPackDialog();
      }, true);
    }

    // Add a "Browse Packs" button in header pack-tools
    const packTools = document.querySelector('.pack-tools');
    if (packTools && !document.getElementById('headerBrowsePacksBtn')) {
      const browseBtn = document.createElement('button');
      browseBtn.id = 'headerBrowsePacksBtn';
      browseBtn.type = 'button';
      browseBtn.className = 'header-browse-packs-btn';
      browseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
        <span>Packs</span>
      `;
      browseBtn.title = 'Browse Web Voice Packs (.zip)';
      browseBtn.addEventListener('click', openPackDialog);
      packTools.appendChild(browseBtn);
    }
  }

  // Watch for loaded pack changes to keep activePackId synced
  function observePackChanges() {
    const packTitleElem = document.getElementById('packTitle');
    if (!packTitleElem) return;

    const observer = new MutationObserver(() => {
      const currentTitle = packTitleElem.textContent.trim().toLowerCase();
      if (currentTitle && currentTitle !== 'no pack loaded') {
        const found = availablePacks.find(p => p.title.toLowerCase() === currentTitle);
        if (found) {
          activePackId = found.id;
        }
      } else {
        activePackId = null;
      }
      syncPackSelectDropdown();
      renderDialogPackList();
      renderTapeShelfWebPacks();
      syncMultiplayerWebPackSelect();
    });

    observer.observe(packTitleElem, { childList: true, characterData: true, subtree: true });
  }

  // Sync Web Voice Pack dropdown in Multiplayer Create Room
  function syncMultiplayerWebPackSelect() {
    const webPackSelect = document.getElementById('multiplayerWebPackSelect');
    const packChoiceDiv = document.querySelector('.multiplayer-pack-choice');
    const packDetail = document.getElementById('multiplayerPackDetail');
    const packEmpty = document.getElementById('multiplayerPackEmpty');

    if (webPackSelect) {
      webPackSelect.innerHTML = '';

      if (!activePackId) {
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        placeholderOpt.textContent = '-- Choose a Web Voice Pack (.zip) --';
        webPackSelect.appendChild(placeholderOpt);
      }

      availablePacks.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        const charCount = Array.isArray(p.characters) ? p.characters.length : 2;
        opt.textContent = `${p.title} (${p.linesCount} lines · ${charCount} roles)`;
        if (p.id === activePackId) {
          opt.selected = true;
        }
        webPackSelect.appendChild(opt);
      });

      const browseOpt = document.createElement('option');
      browseOpt.value = '__browse__';
      browseOpt.textContent = 'Browse all Voice Packs...';
      webPackSelect.appendChild(browseOpt);
    }

    if (activePackId) {
      const currentPack = availablePacks.find(p => p.id === activePackId);
      if (currentPack && packDetail) {
        const charCount = Array.isArray(currentPack.characters) ? currentPack.characters.length : 2;
        packDetail.textContent = `${currentPack.linesCount} clips · ${charCount} players · Web voice pack (${currentPack.filename})`;
      }
      if (packEmpty) packEmpty.hidden = true;
      if (packChoiceDiv) {
        packChoiceDiv.classList.remove('is-missing-pack');
        packChoiceDiv.classList.add('has-web-pack');
      }
    } else {
      if (packDetail) {
        packDetail.textContent = 'Choose a web pack (.zip) for all players to sync.';
      }
      if (packEmpty) packEmpty.hidden = true;
    }
  }

  // Multiplayer Integration
  function wireMultiplayerPackSelector() {
    const choosePackBtn = document.getElementById('multiplayerChoosePack');
    const roomImportBtn = document.getElementById('multiplayerRoomPackImport');
    const webPackSelect = document.getElementById('multiplayerWebPackSelect');
    const packChoiceDiv = document.querySelector('.multiplayer-pack-choice');
    const packDetail = document.getElementById('multiplayerPackDetail');
    const packEmpty = document.getElementById('multiplayerPackEmpty');
    const multiplayerBtn = document.getElementById('multiplayerButton');

    // Intercept click on Choose Pack in Create Room
    if (choosePackBtn) {
      choosePackBtn.textContent = 'Select Pack';
      choosePackBtn.title = 'Browse Web Voice Packs (.zip)';
      choosePackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openPackDialog();
      }, true);
    }

    // Intercept click on Room Pack Import in In-Room section
    if (roomImportBtn) {
      roomImportBtn.textContent = 'Select Pack';
      roomImportBtn.title = 'Browse Web Voice Packs (.zip)';
      roomImportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openPackDialog();
      }, true);
    }

    // Handle change on Web Pack Select
    if (webPackSelect) {
      webPackSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (!val) return;
        if (val === '__browse__') {
          openPackDialog();
          syncMultiplayerWebPackSelect();
          return;
        }

        const pack = availablePacks.find(p => p.id === val);
        if (pack) {
          if (packDetail) packDetail.textContent = `Loading "${pack.title}"...`;
          await selectAndLoadPack(pack, (status) => {
            if (packDetail) packDetail.textContent = status;
          });
          syncMultiplayerWebPackSelect();
        }
      });
    }

    // When multiplayer button is clicked or room action tab is clicked
    if (multiplayerBtn) {
      multiplayerBtn.addEventListener('click', () => {
        setTimeout(() => {
          if (!activePackId && availablePacks.length > 0 && !isLoadingPack) {
            selectAndLoadPack(availablePacks[0]);
          }
          syncMultiplayerWebPackSelect();
        }, 80);
      });
    }

    const createTabBtn = document.getElementById('multiplayerModeCreate');
    if (createTabBtn) {
      createTabBtn.addEventListener('click', () => {
        setTimeout(syncMultiplayerWebPackSelect, 50);
      });
    }

    // Mutation observer on packDetail to prevent multiplayer.js from reverting text to legacy "Import the same ZIP"
    if (packDetail) {
      const detailObserver = new MutationObserver(() => {
        if (packDetail.textContent.includes('Import the same ZIP')) {
          if (activePackId) {
            const currentPack = availablePacks.find(p => p.id === activePackId);
            if (currentPack) {
              const charCount = Array.isArray(currentPack.characters) ? currentPack.characters.length : 2;
              packDetail.textContent = `${currentPack.linesCount} clips · ${charCount} players · Web voice pack (${currentPack.filename})`;
            }
          } else {
            packDetail.textContent = 'Choose a web pack (.zip) for all players to sync.';
          }
        }
        if (packEmpty && !packEmpty.hidden) {
          packEmpty.hidden = true;
        }
      });
      detailObserver.observe(packDetail, { childList: true, characterData: true, subtree: true });
    }

    syncMultiplayerWebPackSelect();
  }

  // Initialization
  async function init() {
    ensureDialogExists();
    wireScreenImportButton();

    const select = document.getElementById('packSelect');
    if (select) {
      select.addEventListener('change', handlePackSelectChange);
    }

    // Fetch packs and render
    await fetchPacks();
    syncPackSelectDropdown();
    renderTapeShelfWebPacks();
    wireMultiplayerPackSelector();
    observePackChanges();

    // Auto-load default pack if none loaded yet
    if (!activePackId && availablePacks.length > 0) {
      const defaultPack = availablePacks[0];
      selectAndLoadPack(defaultPack);
    }

    // Check if URL query specified a pack e.g. ?pack=guardians_meet_avengers
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedPack = params.get('pack');
      if (requestedPack) {
        const match = availablePacks.find(p => p.id === requestedPack || p.filename === requestedPack || p.filename === `${requestedPack}.zip`);
        if (match) {
          console.log('Loading requested pack from URL:', match.filename);
          selectAndLoadPack(match);
        }
      }
    } catch (e) {
      console.warn('Error reading URL pack param:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for testing / external scripts
  window.VoicePackSelector = {
    fetchPacks,
    selectAndLoadPack,
    openPackDialog,
    closePackDialog,
    syncMultiplayerWebPackSelect,
    getAvailablePacks: () => availablePacks,
    getActivePackId: () => activePackId
  };
})();
