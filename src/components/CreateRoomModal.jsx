import React, { useState, useEffect } from 'react';
import { X, Lock, Users, Sparkles } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, packs = [], onCreateRoom, currentUser, defaultPackId = '', t = {} }) {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [hostName, setHostName] = useState(currentUser?.name || '');

  useEffect(() => {
    if (isOpen) {
      const activeName = currentUser?.name || localStorage.getItem('dogdub_player_name') || 'Player';
      setHostName(activeName);
      setRoomName('');
      // Use defaultPackId (from clicking a specific pack card) if provided, otherwise keep current or use first
      if (defaultPackId && packs.some(p => p.id === defaultPackId)) {
        setSelectedPackId(defaultPackId);
      } else if (packs && packs.length > 0 && !selectedPackId) {
        setSelectedPackId(packs[0].id);
      }
    }
  }, [isOpen, packs, defaultPackId, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetPackId = selectedPackId || packs[0]?.id || '';
    const finalRoomName = roomName.trim() || (t.roomNamePlaceholder || 'Dubbing Room');

    onCreateRoom({
      roomName: finalRoomName,
      password: password.trim(),
      packId: targetPackId,
      hostName: hostName.trim() || 'Host',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[oklch(48%_0.06_195)] bg-[oklch(16%_0.012_190)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[oklch(28%_0.01_190)] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--amber)]" />
            <h2 className="font-['Bowlby_One_SC'] text-lg text-white">{t.createModalTitle || "Create New Dubbing Room"}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[var(--muted)]">
              {t.hostNameLabel || "Host Name"}
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder={t.hostNamePlaceholder || "e.g. DubMaster"}
              required
              className="w-full rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(10%_0.01_190)] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[var(--muted)]">
              {t.roomNameLabel || "Room Name"}
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t.roomNamePlaceholder || "e.g. Marvel Dub Squad"}
              required
              className="w-full rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(10%_0.01_190)] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[var(--muted)]">
              {t.selectPackLabel || "Select Scene Pack"}
            </label>
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(10%_0.01_190)] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]"
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.linesCount || 0} {t.scenesUnit || "scenes"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-[var(--muted)]">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.passwordLabel || "Password (Optional for Private Room)"}</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder || "Leave blank for public room"}
              className="w-full rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(10%_0.01_190)] p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10"
            >
              {t.cancel || "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-[var(--amber)] px-5 py-2 text-xs font-bold text-black shadow hover:brightness-105"
            >
              <Users className="h-4 w-4" />
              <span>{t.confirmCreate || "Create Room & Open Lobby"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
