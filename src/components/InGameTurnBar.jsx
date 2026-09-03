import React, { useState } from 'react';
import { RefreshCw, SkipForward, ArrowLeft, Mic, Users, X, Check } from 'lucide-react';

export default function InGameTurnBar({ 
  room, 
  activeTurnIndex = 0, 
  players = [], 
  currentUser,
  onPassTurn, 
  onNextTurn, 
  onLeaveRoom,
  onKickPlayer,
  t = {}
}) {
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const activePlayer = players[activeTurnIndex] || players[0] || { name: 'Player 1' };
  const isHost = Boolean(currentUser?.isHost || room?.hostName === currentUser?.name);
  const isCurrentTurn = Boolean(
    (currentUser?.name && activePlayer?.name === currentUser.name) ||
    (currentUser?.id && activePlayer?.id === currentUser.id)
  );

  // Only Host and the active Mic Holder in queue can control/pass turns
  const canControlTurn = isHost || isCurrentTurn;

  // Filter other players in queue (excluding current active speaker)
  const otherQueuePlayers = players.filter((p, idx) => idx !== activeTurnIndex);

  const handleSelectPassTarget = (targetPlayer) => {
    setIsPassModalOpen(false);
    if (onPassTurn) {
      onPassTurn(targetPlayer.id, targetPlayer.name);
    }
  };

  return (
    <>
      <div className="mb-4 rounded-xl border border-[oklch(48%_0.06_195)] bg-[oklch(14%_0.012_190)] p-3 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Room & Status Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/60 px-2.5 py-1 text-red-200 hover:bg-red-900 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t.leaveRoom || "Leave room"}</span>
            </button>
            <span className="text-gray-500">|</span>
            <span className="text-white">🎮 {t.roomLabel || "Room:"} <b className="text-[var(--cyan)]">{room?.roomName || room?.name || 'Dub Room'}</b></span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-300">{t.codeLabel || "Code:"} <b className="font-mono text-[var(--amber)]">{room?.roomCode || room?.code || '------'}</b></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Pass Turn Button - Opens Modal */}
            <button
              onClick={() => {
                if (canControlTurn) {
                  if (otherQueuePlayers.length > 0) {
                    setIsPassModalOpen(true);
                  } else if (onNextTurn) {
                    onNextTurn();
                  }
                }
              }}
              disabled={!canControlTurn}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                canControlTurn
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'border-gray-700 bg-gray-800/40 text-gray-500 cursor-not-allowed opacity-50'
              }`}
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>🔄 {t.passTurn || "Pass turn to..."}</span>
            </button>

            {/* Next Turn */}
            <button
              onClick={() => {
                if (canControlTurn && onNextTurn) {
                  onNextTurn();
                }
              }}
              disabled={!canControlTurn}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                canControlTurn
                  ? 'bg-[var(--cyan)] text-black hover:brightness-105 active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(0,243,255,0.3)]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
              }`}
              type="button"
            >
              <SkipForward className={`h-3.5 w-3.5 ${canControlTurn ? 'fill-black' : 'fill-gray-500'}`} />
              <span>⏭️ {t.nextTurn || "Next turn"}</span>
            </button>
          </div>
        </div>

        {/* Turn Queue Pills */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-[oklch(24%_0.01_190)] pt-2.5">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] whitespace-nowrap">
            <Users className="h-3 w-3" />
            <span>{t.playersCount || "players"} ({
              players.filter((p, i, self) => self.findIndex(x => (x.id && x.id === p.id) || x.name === p.name) === i).length
            }):</span>
          </span>

          {players.filter((p, i, self) => self.findIndex(x => (x.id && x.id === p.id) || x.name === p.name) === i).map((p, idx) => {
            const isActive = idx === activeTurnIndex;
            const cleanPName = (p.name || '').replace(/^คุณ \((.*)\)$/, '$1');
            const cleanMyName = (currentUser?.name || '').replace(/^คุณ \((.*)\)$/, '$1');
            
            const isSelf = Boolean(
              (cleanMyName && cleanPName === cleanMyName) ||
              (currentUser?.id && p.id === currentUser.id) ||
              (isHost && p.isHost)
            );
            const canKick = isHost && !p.isHost && !isSelf;

            const rawName = p.name === 'Host' && isHost ? (currentUser?.name || 'Host') : p.name;
            const displayName = isSelf ? `${rawName}` : rawName;

            return (
              <div
                key={p.id || idx}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'border-2 border-[var(--cyan)] bg-[var(--cyan)] text-black shadow-lg ring-2 ring-[var(--cyan)]/40'
                    : isSelf
                    ? 'border-2 border-amber-400 bg-[oklch(22%_0.03_60)] text-amber-200 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'border border-[oklch(38%_0.01_190)] bg-[oklch(20%_0.01_190)] text-gray-300'
                }`}
              >
                {isActive && <Mic className="h-3.5 w-3.5 animate-bounce text-black" />}
                <span>{idx + 1}. {displayName}</span>

                {p.isHost && (
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase">
                    (HOST)
                  </span>
                )}

                {canKick && (
                  <button
                    onClick={() => onKickPlayer && onKickPlayer(p.id, p.name)}
                    className="ml-1 rounded bg-red-900/80 hover:bg-red-700 text-white px-1.5 py-0.5 text-[10px] font-bold transition"
                    title={`Kick ${p.name}`}
                  >
                    ❌
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pass Turn Player Selection Modal Window */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[var(--cyan)]/40 bg-gradient-to-b from-[oklch(20%_0.02_195)] to-[oklch(14%_0.01_190)] p-6 shadow-2xl glow-cyan">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-[oklch(28%_0.01_190)] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cyan)]/20 text-[var(--cyan)] border border-[var(--cyan)]/40">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-['Bowlby_One_SC'] text-base text-white">
                    {t.passTurn || "Pass Turn to..."}
                  </h3>
                  <p className="text-[11px] text-[var(--muted)]">
                    เลือกผู้เล่นในห้องที่คุณต้องการส่งไมค์พากย์ต่อให้ทันที
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-700 bg-black/40 text-gray-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Players List Grid */}
            <div className="my-4 flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {otherQueuePlayers.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  ไม่มีผู้เล่นอื่นในห้องขณะนี้
                </div>
              ) : (
                otherQueuePlayers.map((p) => (
                  <button
                    key={p.id || p.name}
                    onClick={() => handleSelectPassTarget(p)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[oklch(38%_0.01_190)] bg-[oklch(18%_0.01_190)] p-3.5 text-left transition-all duration-200 hover:border-[var(--cyan)] hover:bg-[oklch(26%_0.015_190)] hover:shadow-[0_0_15px_rgba(0,243,255,0.2)] group"
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/30 group-hover:bg-[var(--cyan)] group-hover:text-black transition">
                        <Mic className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-white text-sm block group-hover:text-[var(--cyan)] transition">{p.name}</span>
                        {p.isHost && (
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase">
                            (HOST)
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="rounded-xl bg-[var(--cyan)]/10 px-3.5 py-1.5 text-xs font-extrabold text-[var(--cyan)] border border-[var(--cyan)]/30 group-hover:bg-[var(--cyan)] group-hover:text-black transition shadow">
                      🎤 ส่งไมค์
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 border-t border-[oklch(28%_0.01_190)] pt-3 text-right">
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-gray-700 transition"
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
