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
    <section className="mx-auto my-6 max-w-5xl px-4 animate-view-enter">
      {/* Compact Header Bar */}
      <div className="relative mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-[oklch(38%_0.015_190)] bg-gradient-to-r from-[oklch(18%_0.02_205)] to-[oklch(13%_0.01_190)] px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Film className="h-5 w-5 text-[var(--cyan)] animate-bounce" />
          <h2 className="font-['Bowlby_One_SC'] text-base md:text-lg text-white">
            {t.heroTitle || "🎙️ Online Voice Dubbing Studio"}
          </h2>
        </div>
        
        <button
          onClick={() => onOpenCreateModal && onOpenCreateModal()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--amber)] px-4 py-2 text-xs font-black text-black shadow-md hover:brightness-110 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>{t.createRoom || "Create Room"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder || "Search room name or Scene Pack..."}
            className="w-full rounded-xl border border-[oklch(35%_0.01_190)] bg-[oklch(11%_0.01_190)] py-2.5 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--cyan)] shadow-inner"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: t.filterAll || "All" },
            { id: 'recording', label: t.filterRecording || "🔴 Live Dubbing" },
            { id: 'public', label: t.filterPublic || "🔓 Public" },
            { id: 'private', label: t.filterPrivate || "🔒 Private" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterState(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                filterState === f.id
                  ? 'bg-[var(--cyan)] text-black shadow-md'
                  : 'border border-[oklch(32%_0.01_190)] bg-[oklch(16%_0.01_190)] text-gray-300 hover:bg-[oklch(22%_0.01_190)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded-xl border border-[oklch(32%_0.01_190)] bg-[oklch(16%_0.01_190)] px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white active:scale-95 transition-all"
            title={t.refresh || "Refresh"}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Active Rooms Grid */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-['Bowlby_One_SC'] text-base text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span>{t.activeRooms || "Active Rooms"}</span>
          </h3>
          <span className="text-xs font-bold text-[var(--muted)]">
            {filteredRooms.length} {t.activeRooms || "rooms"}
          </span>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[oklch(30%_0.01_190)] bg-[oklch(13%_0.01_190)] p-8 text-center">
            <Film className="mx-auto h-10 w-10 text-[var(--muted)]" />
            <h4 className="mt-2 text-sm font-bold text-white">{t.noRoomsFound || "No active rooms right now"}</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.noRoomsDesc || "Click 'Create Room' above to start dubbing with friends."}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room, idx) => {
              const isPrivate = Boolean(room.isPrivate || room.hasPassword);
              const playersCount = room.players?.length || room.playerCount || 1;
              return (
                <div
                  key={room.id || room.roomCode}
                  style={{ animationDelay: `${(idx % 8) * 60}ms` }}
                  className="animate-card-cascade flex flex-col justify-between rounded-2xl border border-[oklch(38%_0.01_190)] bg-gradient-to-b from-[oklch(18%_0.01_190)] to-[oklch(12%_0.01_190)] p-4 shadow-lg transition-all duration-300 hover:border-[var(--cyan)] hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-[oklch(24%_0.01_190)] pb-2.5">
                      <span className="font-['Bowlby_One_SC'] text-sm text-white truncate max-w-[180px]">
                        {room.roomName || room.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                          isPrivate ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {isPrivate ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {isPrivate ? (t.privateRoom || 'Private') : (t.publicRoom || 'Public')}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs">
                      <p className="text-[var(--amber)] font-bold truncate">
                        🎬 {room.packTitle || 'Scene Pack'}
                      </p>
                      <div className="flex items-center justify-between text-[var(--muted)] font-semibold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-[var(--cyan)]" />
                          <span>{playersCount} {t.playersCount || "players"}</span>
                        </span>
                        <span className="font-mono text-gray-400">#{room.roomCode || room.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[oklch(24%_0.01_190)] pt-3">
                    <button
                      onClick={() => onJoinRoom && onJoinRoom(room)}
                      className="w-full rounded-xl bg-[var(--cyan)] py-2 text-xs font-black text-black shadow transition hover:brightness-110 active:scale-95"
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
          {packs.map((pack, idx) => (
            <div
              key={pack.id}
              onClick={() => onPreviewPack && onPreviewPack(pack)}
              style={{ animationDelay: `${(idx % 12) * 40}ms` }}
              className="animate-card-cascade flex flex-col justify-between overflow-hidden rounded-2xl border border-[oklch(38%_0.01_190)] bg-gradient-to-b from-[oklch(20%_0.01_190)] to-[oklch(12%_0.01_190)] shadow-lg transition-all duration-300 hover:border-[var(--cyan)] hover:-translate-y-1.5 cursor-pointer group"
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
                    {pack.linesCount || pack.lines?.length || pack.totalLines || 0} {t.linesCount || "scenes"}
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
