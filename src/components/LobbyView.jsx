import React, { useState } from 'react';
import { Search, RefreshCw, Plus, Lock, Unlock, PlayCircle, Users, Film, Sparkles, Radio, Globe, Mail } from 'lucide-react';

export default function LobbyView({ 
  rooms = [], 
  packs = [], 
  onRefresh, 
  onOpenCreateModal, 
  onJoinRoom, 
  onSelectPack,
  onPreviewPack,
  t = {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [selectedPackId, setSelectedPackId] = useState('');

  const filteredRooms = rooms.filter((r) => {
    const roomTitle = r.roomName || r.name || '';
    const packTitle = r.packTitle || r.pack?.title || '';
    const roomCode = r.roomCode || r.code || '';
    const matchesSearch = 
      roomTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      packTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomCode.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    const isPrivate = Boolean(r.isPrivate || r.hasPassword);
    if (filterState === 'waiting') return r.status === 'waiting';
    if (filterState === 'recording') return r.status === 'recording';
    if (filterState === 'public') return !isPrivate;
    if (filterState === 'private') return isPrivate;
    return true;
  });

  return (
    <section className="mx-auto my-6 max-w-5xl px-4 animate-fade-in">
      {/* Compact Header Bar */}
      <div className="relative mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[var(--cyan)]/30 bg-gradient-to-r from-[oklch(18%_0.03_205)] to-[oklch(13%_0.01_190)] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot flex-shrink-0" />
          <h1 className="font-['Bowlby_One_SC'] text-base md:text-lg tracking-wide text-white">
            {t.heroTitle || "🎙️ Online Voice Dubbing Studio"}
          </h1>
        </div>
        <p className="text-xs text-[var(--muted)] line-clamp-1">
          {t.heroDesc || "Gather your friends to dub hilarious movie scenes live!"}
        </p>
      </div>

      {/* Control Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[oklch(38%_0.01_190)] bg-black/40 backdrop-blur-md p-4 shadow-xl md:flex-row md:items-center md:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--cyan)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder || "Search room name or Scene Pack..."}
            className="w-full rounded-xl border border-[oklch(38%_0.01_190)] bg-[oklch(10%_0.01_190)] py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-400 transition-all focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)] focus:shadow-[0_0_15px_rgba(0,243,255,0.25)]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: t.filterAll || 'All' },
            { id: 'recording', label: t.filterRecording || '🔴 Live Dubbing' },
            { id: 'public', label: t.filterPublic || '🔓 Public' },
            { id: 'private', label: t.filterPrivate || '🔒 Private' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterState(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                filterState === f.id
                  ? 'bg-[var(--cyan)] text-black shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                  : 'border border-[oklch(38%_0.01_190)] bg-[oklch(14%_0.01_190)] text-gray-300 hover:border-gray-500 hover:bg-[oklch(22%_0.01_190)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-[oklch(40%_0.01_190)] bg-[oklch(20%_0.01_190)] px-3.5 py-2 text-xs font-bold text-white transition hover:border-[var(--cyan)] hover:bg-[oklch(28%_0.01_190)] active:scale-95 shadow"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[var(--cyan)]" />
            <span>{t.refresh || "Refresh"}</span>
          </button>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--amber)] to-yellow-400 px-5 py-2 text-xs font-extrabold text-black shadow-[0_0_15px_rgba(255,183,0,0.3)] transition hover:brightness-110 hover:shadow-[0_0_25px_rgba(255,183,0,0.5)] active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>{t.createRoom || "Create Room"}</span>
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-['Bowlby_One_SC'] text-lg text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-[var(--cyan)]" />
            <span>{t.activeRooms || "Active Rooms"} ({filteredRooms.length})</span>
          </h3>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[oklch(38%_0.01_190)] bg-black/30 py-14 text-center text-gray-400 backdrop-blur-sm">
            <div className="mb-3 text-4xl">🎬</div>
            <p className="text-base font-bold text-gray-200">{t.noRoomsFound || "No active rooms right now"}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{t.noRoomsDesc || "Click 'Create Room' above to start dubbing with friends."}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room, idx) => {
              const code = room.code || room.roomCode || '';
              const title = room.name || room.roomName || `Room ${code}`;
              const packName = room.packTitle || room.pack?.title || 'Voice Pack';
              const isPrivate = Boolean(room.isPrivate || room.hasPassword);
              const count = Array.isArray(room.players) ? room.players.length : (room.playersCount || 1);

              return (
                <div
                  key={code || idx}
                  className="flex flex-col justify-between rounded-2xl border border-[oklch(38%_0.01_190)] bg-gradient-to-b from-[oklch(20%_0.015_190)] to-[oklch(14%_0.01_190)] p-5 shadow-xl transition-all duration-300 hover:border-[var(--cyan)] hover:shadow-[0_0_25px_rgba(0,243,255,0.2)] hover:-translate-y-1 group"
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-[var(--amber)] bg-black/50 px-2.5 py-1 rounded-lg border border-[var(--amber)]/30 shadow-inner">
                        #{code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                          isPrivate
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80'
                        }`}
                      >
                        {isPrivate ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {isPrivate ? (t.privateRoom || 'Private') : (t.publicRoom || 'Public')}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base group-hover:text-[var(--cyan)] transition-colors line-clamp-1">{title}</h4>
                    <p className="mt-1.5 text-xs text-[var(--muted)] flex items-center gap-1">
                      <Film className="h-3.5 w-3.5 text-[var(--cyan)]" />
                      <span className="line-clamp-1">{packName}</span>
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[oklch(28%_0.01_190)] pt-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                      <Users className="h-4 w-4 text-[var(--cyan)]" />
                      <span>{count} {t.playersCount || 'players'}</span>
                    </div>

                    <button
                      onClick={() => onJoinRoom(room)}
                      className="rounded-xl bg-[var(--cyan)] px-4 py-2 text-xs font-extrabold text-black shadow-[0_0_12px_rgba(0,243,255,0.3)] transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] active:scale-95"
                    >
                      {t.joinRoom || "Join room"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scene Packs Showcase */}
      <div>
        <div className="mb-4">
          <h3 className="font-['Bowlby_One_SC'] text-lg text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--amber)]" />
            <span>{t.scenePacksTitle || "Scene Packs Available"}</span>
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {packs.map((pack) => (
            <div
              key={pack.id}
              onClick={() => onPreviewPack && onPreviewPack(pack)}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[oklch(38%_0.01_190)] bg-gradient-to-b from-[oklch(20%_0.01_190)] to-[oklch(12%_0.01_190)] shadow-lg transition-all duration-300 hover:border-[var(--cyan)] hover:shadow-[0_0_25px_rgba(0,243,255,0.25)] hover:-translate-y-1.5 cursor-pointer group"
            >
              {/* Cover Artwork Header */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                <img
                  src={pack.cover || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop'}
                  alt={pack.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[oklch(12%_0.01_190)] via-transparent to-black/30" />

                {/* Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                  <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--amber)] border border-[var(--amber)]/40 shadow">
                    {pack.category || 'Movie'}
                  </span>
                  <span className="rounded-md bg-[var(--cyan)]/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-black uppercase text-black shadow">
                    {pack.linesCount || 5} {t.linesCount || "scenes"}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-col justify-between p-4 flex-1">
                <div>
                  <h4 className="font-bold text-white text-sm leading-snug group-hover:text-[var(--cyan)] transition-colors line-clamp-1">
                    {pack.title}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                    {pack.description || 'High-quality dubbing video scenes'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPackId(pack.id);
                    if (onOpenCreateModal) onOpenCreateModal(pack);
                  }}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 py-2 text-xs font-extrabold text-[var(--amber)] transition-all group-hover:bg-[var(--amber)] group-hover:text-black shadow"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.createRoomForScene || "🎬 Create Room for This Scene"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
