import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LobbyView from './components/LobbyView';
import CreateRoomModal from './components/CreateRoomModal';
import WaitingRoomView from './components/WaitingRoomView';
import InGameTurnBar from './components/InGameTurnBar';
import DubMonitor from './components/DubMonitor';
import DubControls from './components/DubControls';
import WatchDubModal from './components/WatchDubModal';
import MicSettingsModal from './components/MicSettingsModal';
import SetPlayerNameModal from './components/SetPlayerNameModal';
import HowToPlayModal from './components/HowToPlayModal';
import ScenePackPreviewModal from './components/ScenePackPreviewModal';
import { parseScenePackZip } from './services/packReader';
import { audioEngine } from './services/audioEngine';
import { translations } from './translations';

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('dogdub_lang') || 'en');
  const t = translations[lang] || translations.en;

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'th' : 'en';
    setLang(nextLang);
    localStorage.setItem('dogdub_lang', nextLang);
  };

  const [currentView, setCurrentView] = useState('lobby'); // 'lobby' | 'waitingRoom' | 'inGame'
  const [packs, setPacks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [activePackData, setActivePackData] = useState(null);
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState({ name: t.defaultPlayerName || 'Dubber', isHost: false });
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTakes, setRecordedTakes] = useState({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWatchDubOpen, setIsWatchDubOpen] = useState(false);
  const [isMicSettingsOpen, setIsMicSettingsOpen] = useState(false);
  const [isSetNameModalOpen, setIsSetNameModalOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [selectedPreviewPack, setSelectedPreviewPack] = useState(null);

  // Fetch available scene packs, rooms, and check saved player name on mount
  useEffect(() => {
    fetchPacks();
    fetchRooms();

    const savedName = localStorage.getItem('dogdub_player_name');
    if (savedName) {
      setCurrentUser((prev) => ({ ...prev, name: savedName }));
    } else {
      setIsSetNameModalOpen(true);
    }
  }, []);

  // Auto-leave room when browser tab is closed or window is navigated away
  useEffect(() => {
    const handleTabClose = () => {
      if (activeRoom) {
        const code = activeRoom.code || activeRoom.roomCode;
        const token = currentUser?.token || '';
        const payload = JSON.stringify({ action: 'leave', token });
        const blob = new Blob([payload], { type: 'application/json' });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/rooms/${code}`, blob);
        } else {
          fetch(`/api/rooms/${code}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-room-token': token },
            body: payload,
            keepalive: true,
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleTabClose);
    window.addEventListener('pagehide', handleTabClose);
    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      window.removeEventListener('pagehide', handleTabClose);
    };
  }, [activeRoom, currentUser]);

  const handleSavePlayerName = (newName) => {
    localStorage.setItem('dogdub_player_name', newName);
    setCurrentUser((prev) => ({ ...prev, name: newName }));
    if (activeRoom) {
      setActiveRoom((prev) => {
        if (!prev || !prev.players) return prev;
        return {
          ...prev,
          players: prev.players.map((p) => (p.isHost || p.name === currentUser?.name ? { ...p, name: newName } : p)),
        };
      });
    }
  };

const DEFAULT_FALLBACK_PACKS = [
  {
    id: 'guardians_meet_avengers',
    filename: 'guardians_meet_avengers.zip',
    title: 'Guardians Meet Avengers',
    author: 'Choicer Voicer',
    description: 'When the Guardians of the Galaxy encounter Thor floating in deep space.',
    linesCount: 5,
    characters: ['STAR-LORD', 'DRAX', 'GAMORA', 'THOR'],
    url: '/packs/guardians_meet_avengers.zip'
  },
  {
    id: 'matrix_red_pill',
    filename: 'matrix_red_pill.zip',
    title: 'The Matrix: Red Pill or Blue Pill',
    author: 'Choicer Voicer',
    description: 'Morpheus offers Neo the choice between remaining in illusion or discovering the truth.',
    linesCount: 4,
    characters: ['MORPHEUS', 'NEO'],
    url: '/packs/matrix_red_pill.zip'
  },
  {
    id: 'pulp_fiction_royale',
    filename: 'pulp_fiction_royale.zip',
    title: 'Pulp Fiction: Royale with Cheese',
    author: 'Choicer Voicer',
    description: 'Vincent and Jules discuss the little differences between America and Europe.',
    linesCount: 5,
    characters: ['VINCENT', 'JULES'],
    url: '/packs/pulp_fiction_royale.zip'
  },
  {
    id: 'star_wars-i_am_your_father',
    filename: 'star_wars-i_am_your_father.zip',
    title: 'Star Wars: I Am Your Father',
    author: 'Choicer Voicer',
    description: 'The legendary confrontation between Darth Vader and Luke Skywalker on Cloud City.',
    linesCount: 3,
    characters: ['DARTH VADER', 'LUKE'],
    url: '/packs/star_wars-i_am_your_father.zip'
  }
];

  const fetchPacks = async () => {
    try {
      const res = await fetch('/api/packs');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.packs && data.packs.length > 0) {
          setPacks(data.packs);
          if (!selectedPackId) {
            loadPack(data.packs[0].id, data.packs[0].url);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Backend /api/packs offline, using fallback scene packs:', err);
    }
    // Fallback to local default packs if backend is offline
    setPacks(DEFAULT_FALLBACK_PACKS);
    if (!selectedPackId && DEFAULT_FALLBACK_PACKS.length > 0) {
      loadPack(DEFAULT_FALLBACK_PACKS[0].id, DEFAULT_FALLBACK_PACKS[0].url);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.rooms) {
          setRooms(data.rooms);
        }
      }
    } catch (err) {
      console.warn('Backend /api/rooms offline:', err);
    }
  };

  const loadPack = async (packId, packUrl) => {
    setSelectedPackId(packId);
    const targetUrl = packUrl || `/packs/${packId}.zip`;
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const packData = await parseScenePackZip(arrayBuffer);
        setActivePackData(packData);
        setCurrentLineIndex(0);
      }
    } catch (err) {
      console.error('Error loading pack:', err);
    }
  };

  const handleCreateRoom = async (roomData) => {
    try {
      const hostName = roomData.hostName || currentUser?.name || localStorage.getItem('dogdub_player_name') || 'นักพากย์';
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-room-token': currentUser?.token || '',
        },
        body: JSON.stringify({
          ...roomData,
          playerName: hostName,
          name: hostName,
          token: currentUser?.token || '',
        }),
      });
      const data = await res.json();
      const roomObj = data.room || data.state;
      if (roomObj) {
        setActiveRoom(roomObj);
        setCurrentUser({ name: hostName, isHost: true, token: data.token });
        setIsCreateModalOpen(false);

        // Load chosen pack
        const targetPackId = roomData.packId || packs[0]?.id;
        if (targetPackId) {
          const found = packs.find((p) => p.id === targetPackId) || packs[0];
          if (found) {
            loadPack(found.id, found.url);
          }
        }

        setCurrentView('inGame'); // Enter in-game workspace directly
        fetchRooms();
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = async (room) => {
    const activeName = currentUser?.name || localStorage.getItem('dogdub_player_name') || 'นักพากย์';
    try {
      const res = await fetch(`/api/rooms/${room.code || room.roomCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-room-token': currentUser?.token || '',
        },
        body: JSON.stringify({ action: 'join', name: activeName, playerName: activeName, token: currentUser?.token || '' }),
      });
      const data = await res.json();
      const updatedState = data.state || room;
      setActiveRoom(updatedState);
      setCurrentUser({ name: activeName, isHost: Boolean(updatedState.you?.isHost), token: data.token || currentUser?.token });
      setCurrentView('inGame'); // Enter in-game directly without waiting
    } catch (err) {
      setActiveRoom(room);
      setCurrentUser({ name: activeName, isHost: false });
      setCurrentView('inGame');
    }
  };

  const handleKickPlayer = async (playerId, playerName) => {
    if (!activeRoom) return;
    if (window.confirm(`คุณต้องการเตะผู้เล่น "${playerName}" ออกจากห้องใช่หรือไม่?`)) {
      try {
        const res = await fetch(`/api/rooms/${activeRoom.code || activeRoom.roomCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-room-token': currentUser.token || '',
          },
          body: JSON.stringify({ action: 'kick', targetPlayerId: playerId }),
        });
        const data = await res.json();
        if (data.ok && data.state) {
          setActiveRoom(data.state);
        } else {
          // Fallback local update
          setActiveRoom((prev) => ({
            ...prev,
            players: prev.players.filter((p) => p.id !== playerId && p.name !== playerName),
          }));
        }
      } catch (err) {
        setActiveRoom((prev) => ({
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId && p.name !== playerName),
        }));
      }
    }
  };

  const handleLeaveRoom = async () => {
    if (activeRoom) {
      const roomCode = activeRoom.code || activeRoom.roomCode;
      try {
        await fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-room-token': currentUser.token || '',
          },
          body: JSON.stringify({ action: 'leave' }),
        });
      } catch (e) {
        console.warn('Failed to send leave action to server:', e);
      }
    }

    setActiveRoom(null);
    setCurrentView('lobby');

    // Refresh rooms list in lobby
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.ok && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      }
    } catch (e) {}
  };

  const currentLine = activePackData?.lines?.[currentLineIndex] || null;

  // Audio recording handlers
  const handleToggleRecord = async () => {
    if (isRecording) {
      const result = await audioEngine.stopRecording();
      setIsRecording(false);
      if (result) {
        setRecordedTakes((prev) => ({
          ...prev,
          [currentLineIndex]: result.url,
        }));
      }
    } else {
      await audioEngine.prepareRecording();
      setIsRecording(true);
    }
  };

  const handleHearClip = () => {
    if (currentLine?.audioUrl) {
      setIsPlayingAudio(true);
      audioEngine.playAudioUrl(currentLine.audioUrl, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const handlePlayRecording = () => {
    const takeUrl = recordedTakes[currentLineIndex];
    if (takeUrl) {
      setIsPlayingAudio(true);
      audioEngine.playRecordedBuffer(takeUrl, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const playersList = activeRoom?.players || [
    { name: currentUser.name || 'Player 1' },
    { name: 'Player 2' },
  ];

  const activeSpeaker = playersList[activeTurnIndex] || playersList[0];
  const isMyTurn = Boolean(
    !activeRoom || // Solo mode: always your turn!
    currentUser?.isHost ||
    (activeSpeaker && (
      activeSpeaker.name === currentUser?.name ||
      activeSpeaker.id === currentUser?.id ||
      (activeSpeaker.name && currentUser?.name && activeSpeaker.name.includes(currentUser.name))
    ))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        packs={packs}
        selectedPackId={selectedPackId}
        onSelectPack={(id) => {
          const found = packs.find((p) => p.id === id);
          if (found) loadPack(id, found.url);
        }}
        activeRoom={activeRoom}
        playerName={currentUser.name}
        onOpenEditNameModal={() => setIsSetNameModalOpen(true)}
        onOpenHowToPlayModal={() => setIsHowToPlayOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        lang={lang}
        onToggleLang={handleToggleLang}
        t={t}
      />

      <main className="flex-1 pb-12">
        {currentView === 'lobby' && (
          <LobbyView
            rooms={rooms}
            packs={packs}
            onRefresh={fetchRooms}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onJoinRoom={handleJoinRoom}
            onPreviewPack={(pack) => setSelectedPreviewPack(pack)}
            onSelectPack={(id) => {
              const found = packs.find((p) => p.id === id);
              if (found) {
                loadPack(id, found.url);
                setCurrentView('inGame');
              }
            }}
            t={t}
          />
        )}

        {currentView === 'waitingRoom' && (
          <WaitingRoomView
            room={activeRoom}
            currentUser={currentUser}
            onLeaveRoom={handleLeaveRoom}
            onStartGame={handleStartGame}
          />
        )}

        {currentView === 'inGame' && (
          <div className="mx-auto my-6 max-w-5xl px-4">
            <InGameTurnBar
              room={activeRoom}
              activeTurnIndex={activeTurnIndex}
              players={playersList}
              currentUser={currentUser}
              onPassTurn={(targetId, targetName) => {
                if (targetId) {
                  const targetIdx = playersList.findIndex((p) => p.id === targetId || p.name === targetName);
                  if (targetIdx !== -1) {
                    setActiveTurnIndex(targetIdx);
                    return;
                  }
                }
                setActiveTurnIndex((prev) => (prev + 1) % playersList.length);
              }}
              onNextTurn={() => {
                setActiveTurnIndex((prev) => (prev + 1) % playersList.length);
                if (currentLineIndex < (activePackData?.lines?.length || 1) - 1) {
                  setCurrentLineIndex((prev) => prev + 1);
                }
              }}
              onLeaveRoom={handleLeaveRoom}
              onKickPlayer={handleKickPlayer}
              t={t}
            />

            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <DubMonitor
                  currentLine={currentLine}
                  currentLineIndex={currentLineIndex}
                  totalLines={activePackData?.lines?.length || 0}
                  packTitle={activePackData?.title}
                  recordedTakeUrl={recordedTakes[currentLineIndex]}
                  isPlaying={isPlayingAudio}
                  isRecording={isRecording}
                  onAutoStopRecord={handleToggleRecord}
                />
              </div>

              <div>
                <DubControls
                  currentLineIndex={currentLineIndex}
                  totalLines={activePackData?.lines?.length || 0}
                  recordedTakesCount={Object.keys(recordedTakes).length}
                  isRecording={isRecording}
                  hasRecordedTake={Boolean(recordedTakes[currentLineIndex])}
                  isMyTurn={isMyTurn}
                  onHearClip={handleHearClip}
                  onToggleRecord={handleToggleRecord}
                  onPlayRecording={handlePlayRecording}
                  onPrevClip={() => setCurrentLineIndex((prev) => Math.max(0, prev - 1))}
                  onNextClip={() => setCurrentLineIndex((prev) => Math.min((activePackData?.lines?.length || 1) - 1, prev + 1))}
                  onWatchDub={() => setIsWatchDubOpen(true)}
                  onOpenMicSettings={() => setIsMicSettingsOpen(true)}
                  onOpenFeedback={() => alert(lang === 'en' ? 'Feedback submitted successfully' : 'ส่งข้อเสนอแนะสำเร็จ')}
                  t={t}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        packs={packs}
        currentUser={currentUser}
        onCreateRoom={handleCreateRoom}
      />

      <WatchDubModal
        isOpen={isWatchDubOpen}
        onClose={() => setIsWatchDubOpen(false)}
        packTitle={activePackData?.title}
        packLines={activePackData?.lines || []}
        backingTrackUrl={activePackData?.backingTrackUrl}
        recordedTakes={recordedTakes}
      />

      <MicSettingsModal
        isOpen={isMicSettingsOpen}
        onClose={() => setIsMicSettingsOpen(false)}
      />

      <SetPlayerNameModal
        isOpen={isSetNameModalOpen}
        onClose={() => setIsSetNameModalOpen(false)}
        currentName={currentUser.name}
        onSaveName={handleSavePlayerName}
      />

      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      <ScenePackPreviewModal
        isOpen={Boolean(selectedPreviewPack)}
        onClose={() => setSelectedPreviewPack(null)}
        pack={selectedPreviewPack}
        onStartSolo={(packId, packUrl) => {
          loadPack(packId, packUrl);
          setCurrentView('inGame');
        }}
        onCreateRoom={(pack) => {
          setSelectedPackId(pack.id);
          setIsCreateModalOpen(true);
        }}
      />
    </div>
  );
}
