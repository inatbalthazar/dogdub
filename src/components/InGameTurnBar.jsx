import React, { useState } from 'react';
import { RefreshCw, ArrowLeft, Mic, Users, X, Check, Radio } from 'lucide-react';

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

          {/* Center ON AIR Spotlight Banner */}
          <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1 text-xs font-extrabold text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />
            <span className="text-red-300 uppercase tracking-wide">ON AIR:</span>
            <span className="text-[var(--cyan)] font-black text-sm drop-shadow">{activePlayer?.name || 'Player 1'}</span>
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
                    ? 'border-2 border-[var(--cyan)] bg-[var(--cyan)] text-black shadow-lg ring-2 ring-[var(--cyan)]/40 scale-105'
                    : isSelf
                    ? 'border-2 border-amber-400 bg-[oklch(22%_0.03_60)] text-amber-200 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'border border-[oklch(38%_0.01_190)] bg-[oklch(20%_0.01_190)] text-gray-300'
                }`}
              >
                {isActive ? (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                    <Mic className="h-3.5 w-3.5 text-black" />
                  </span>
                ) : (
                  <span className="text-[10px] opacity-60">#{idx + 1}</span>
                )}
                <span>{displayName}</span>

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

      {/* Modal Selection Window for Passing Turn */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border-2 border-[var(--cyan)] bg-[oklch(16%_0.015_190)] p-5 shadow-[0_0_30px_rgba(0,243,255,0.3)]">
            <div className="flex items-center justify-between border-b border-[oklch(28%_0.01_190)] pb-3">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-[var(--cyan)] animate-pulse" />
                <h3 className="text-base font-extrabold text-white">
                  {t.passTurnTitle || "ส่งต่อคิวพากย์ให้เพื่อน (Pass Mic)"}
                </h3>
              </div>
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="my-3 text-xs text-gray-300">
              เลือกผู้เล่นที่ต้องการส่งต่อไมโครโฟนเพื่อพากย์ประโยคถัดไป:
            </p>

            <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
              {otherQueuePlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelectPassTarget(player)}
                  className="group flex items-center justify-between rounded-xl border border-[oklch(30%_0.02_190)] bg-[oklch(20%_0.015_190)] p-3 text-left transition hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/15 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cyan)]/20 text-sm font-extrabold text-[var(--cyan)] group-hover:bg-[var(--cyan)] group-hover:text-black transition">
                      🎤
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-[var(--cyan)]">
                        {player.name}
                      </div>
                      {player.isHost && (
                        <div className="text-[10px] font-bold text-amber-400">
                          เจ้าของห้อง (Host)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-[var(--cyan)]/20 px-2.5 py-1 text-xs font-bold text-[var(--cyan)] group-hover:bg-[var(--cyan)] group-hover:text-black transition">
                    <span>เลือก</span>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-gray-700 transition"
              >
                {t.cancel || "ยกเลิก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
