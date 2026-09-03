import React from 'react';
import { Copy, ArrowLeft, Play, Users, Lock, Unlock, Check } from 'lucide-react';

export default function WaitingRoomView({ 
  room, 
  currentUser, 
  onLeaveRoom, 
  onStartGame,
  t = {}
}) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!room) return null;

  const isHost = room.hostName === currentUser?.name || currentUser?.isHost;

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section className="mx-auto my-6 max-w-4xl px-4 animate-view-enter">
      <div className="rounded-2xl border border-[oklch(48%_0.06_195)] bg-[oklch(16%_0.012_190)] p-6 shadow-2xl">
        {/* Topbar */}
        <div className="mb-6 flex items-center justify-between border-b border-[oklch(28%_0.01_190)] pb-4">
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 rounded-lg border border-[oklch(40%_0.01_190)] bg-[oklch(22%_0.01_190)] px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-[oklch(28%_0.01_190)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.leaveRoomLobby || "Leave room (Back to Lobby)"}</span>
          </button>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
              room.isPrivate
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {room.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {room.isPrivate ? (t.privateRoomBadge || '🔒 Private Room') : (t.publicRoomBadge || '🔓 Public Room')}
          </span>
        </div>

        {/* Room Meta */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              {t.dubRoomLabel || "Dubbing Room"}
            </span>
            <h2 className="font-['Bowlby_One_SC'] text-2xl text-white md:text-3xl">
              {room.roomName}
            </h2>
            <p className="mt-1 text-xs font-semibold text-[var(--amber)]">
              🎬 Scene Pack: {room.packTitle || 'Scene Pack'}
            </p>
          </div>

          {/* Room Code Card */}
          <div className="rounded-xl border border-[oklch(38%_0.01_190)] bg-[oklch(11%_0.01_190)] p-4 text-center">
            <span className="text-[10px] font-bold uppercase text-[var(--muted)]">
              {t.roomCodeLabel || "ROOM CODE"}
            </span>
            <div className="my-1 font-mono text-3xl font-extrabold tracking-widest text-[var(--cyan)]">
              {room.roomCode}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-1 rounded bg-[oklch(24%_0.01_190)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[oklch(32%_0.01_190)]"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode ? (t.copied || 'Copied!') : (t.copyCode || 'Copy Code')}</span>
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-1 rounded bg-[oklch(24%_0.01_190)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[oklch(32%_0.01_190)]"
              >
                {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedLink ? (t.copied || 'Copied!') : (t.copyLink || 'Copy Link')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 border-b border-[oklch(28%_0.01_190)] pb-2">
            <Users className="h-4 w-4 text-[var(--cyan)]" />
            <h3 className="font-['Bowlby_One_SC'] text-sm text-white">
              👥 {t.membersInRoom || "Members in Room"} ({room.players?.length || 1})
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(room.players || [{ name: room.hostName || 'Host', isHost: true }]).map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-[oklch(38%_0.01_190)] bg-[oklch(12%_0.01_190)] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cyan)] text-xs font-bold text-black">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">{p.name}</span>
                    {p.isHost && (
                      <span className="ml-2 rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-800">
                        HOST
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-emerald-400">{t.readyToDub || "● Ready"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Area */}
        <div className="mt-8 border-t border-[oklch(28%_0.01_190)] pt-6">
          {isHost ? (
            <div className="flex flex-col items-center justify-center text-center">
              <button
                onClick={onStartGame}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--amber)] to-orange-400 px-8 py-3.5 font-['Bowlby_One_SC'] text-base text-black shadow-lg hover:brightness-110 active:scale-95"
              >
                <Play className="h-5 w-5 fill-black" />
                <span>{t.startGameBtn || "🚀 Start Game (START GAME)"}</span>
              </button>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {t.startGameDesc || "Once everyone is ready, press this button to start dubbing together."}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-[oklch(38%_0.01_190)] bg-[oklch(12%_0.01_190)] p-4 text-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cyan)] border-t-transparent" />
              <div className="text-left">
                <strong className="text-xs text-white">{t.waitingForHost || "Waiting for the host to start the game..."}</strong>
                <p className="text-[11px] text-[var(--muted)]">{t.waitingForHostDesc || "Screen will switch to dubbing turns automatically when host starts."}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
