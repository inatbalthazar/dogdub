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
import LoadingOverlay from './components/LoadingOverlay';
import Footer from './components/Footer';
import { parseScenePackZip } from './services/packReader';
import { audioEngine } from './services/audioEngine';
import { soundEffects } from './services/soundEffects';
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

  // Auto-poll active rooms list every 3 seconds when in lobby view
  useEffect(() => {
    let timer = null;
    if (currentView === 'lobby') {
      fetchRooms();
      timer = setInterval(() => {
        fetchRooms();
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentView]);

  // Send active heartbeat and sync room state every 3 seconds while inside a room
  useEffect(() => {
    let timer = null;
    if (activeRoom && (currentView === 'inGame' || currentView === 'waitingRoom')) {
      const code = activeRoom.code || activeRoom.roomCode;
      const sendHeartbeat = async () => {
        try {
          const res = await fetch(`/api/rooms/${code}`, {
            headers: {
              'x-room-token': currentUser?.token || '',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.state) {
              setActiveRoom(data.state);
            }
          }
        } catch (err) {
          console.warn('In-game heartbeat error:', err);
        }
      };

      sendHeartbeat();
      timer = setInterval(sendHeartbeat, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRoom?.code, currentView, currentUser?.token]);

  // Sync scene line index across all room clients when server room state updates
  useEffect(() => {
    if (activeRoom && typeof activeRoom.currentLineIndex === 'number') {
      if (activeRoom.currentLineIndex !== currentLineIndex) {
        setCurrentLineIndex(activeRoom.currentLineIndex);
      }
    }
  }, [activeRoom?.currentLineIndex, activeRoom?.currentTurnPlayerId]);

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
    "id": "-__09bf5",
    "filename": "-__09bf5.zip",
    "title": "09bf5",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: 09bf5",
    "linesCount": 5,
    "characters": [],
    "size": 49126895,
    "sizeFormatted": "46.9 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/-__09bf5.zip"
  },
  {
    "id": "-__75374",
    "filename": "-__75374.zip",
    "title": "75374",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: 75374",
    "linesCount": 5,
    "characters": [],
    "size": 27857379,
    "sizeFormatted": "26.6 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/-__75374.zip"
  },
  {
    "id": "300_-_this_is_sparta_",
    "filename": "300_-_this_is_sparta_.zip",
    "title": "300 This Is Sparta",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: 300 This Is Sparta",
    "linesCount": 5,
    "characters": [],
    "size": 297625319,
    "sizeFormatted": "283.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/300_-_this_is_sparta_.zip"
  },
  {
    "id": "annoying_orange_4a4e0",
    "filename": "annoying_orange_4a4e0.zip",
    "title": "Annoying Orange 4a4e0",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Annoying Orange 4a4e0",
    "linesCount": 5,
    "characters": [],
    "size": 13952441,
    "sizeFormatted": "13.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/annoying_orange_4a4e0.zip"
  },
  {
    "id": "Are you the Strongest",
    "filename": "Are you the Strongest.zip",
    "title": "Are You The Strongest",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Are You The Strongest",
    "linesCount": 5,
    "characters": [],
    "size": 25449640,
    "sizeFormatted": "24.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Are%20you%20the%20Strongest.zip"
  },
  {
    "id": "attack_on_titan_-_you_traitor",
    "filename": "attack_on_titan_-_you_traitor.zip",
    "title": "Attack On Titan You Traitor",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Attack On Titan You Traitor",
    "linesCount": 5,
    "characters": [],
    "size": 188012205,
    "sizeFormatted": "179.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/attack_on_titan_-_you_traitor.zip"
  },
  {
    "id": "avengers_arguing",
    "filename": "avengers_arguing.zip",
    "title": "Avengers Arguing",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Avengers Arguing",
    "linesCount": 5,
    "characters": [],
    "size": 208966886,
    "sizeFormatted": "199.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/avengers_arguing.zip"
  },
  {
    "id": "backrooms_-_dinner_scene_e80f0",
    "filename": "backrooms_-_dinner_scene_e80f0.zip",
    "title": "Backrooms Dinner Scene E80f0",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Backrooms Dinner Scene E80f0",
    "linesCount": 5,
    "characters": [],
    "size": 39495110,
    "sizeFormatted": "37.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/backrooms_-_dinner_scene_e80f0.zip"
  },
  {
    "id": "batman_interrogates_the_joker_-_the_dark_knight_96d29",
    "filename": "batman_interrogates_the_joker_-_the_dark_knight_96d29.zip",
    "title": "Batman Interrogates The Joker The Dark Knight 96d29",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Batman Interrogates The Joker The Dark Knight 96d29",
    "linesCount": 5,
    "characters": [],
    "size": 74649260,
    "sizeFormatted": "71.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/batman_interrogates_the_joker_-_the_dark_knight_96d29.zip"
  },
  {
    "id": "beyond_the_spiderverse_trailer_0d846",
    "filename": "beyond_the_spiderverse_trailer_0d846.zip",
    "title": "Beyond The Spiderverse Trailer 0d846",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Beyond The Spiderverse Trailer 0d846",
    "linesCount": 5,
    "characters": [],
    "size": 108981486,
    "sizeFormatted": "103.9 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/beyond_the_spiderverse_trailer_0d846.zip"
  },
  {
    "id": "Dexter - Cargo Scene",
    "filename": "Dexter - Cargo Scene.zip",
    "title": "Dexter Cargo Scene",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Dexter Cargo Scene",
    "linesCount": 5,
    "characters": [],
    "size": 38113883,
    "sizeFormatted": "36.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Dexter%20-%20Cargo%20Scene.zip"
  },
  {
    "id": "don_t_let_me_leave_murph",
    "filename": "don_t_let_me_leave_murph.zip",
    "title": "Don T Let Me Leave Murph",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Don T Let Me Leave Murph",
    "linesCount": 5,
    "characters": [],
    "size": 37885013,
    "sizeFormatted": "36.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/don_t_let_me_leave_murph.zip"
  },
  {
    "id": "Elsa Flees From Arendelle",
    "filename": "Elsa Flees From Arendelle.zip",
    "title": "Elsa Flees From Arendelle",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Elsa Flees From Arendelle",
    "linesCount": 5,
    "characters": [],
    "size": 138054924,
    "sizeFormatted": "131.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Elsa%20Flees%20From%20Arendelle.zip"
  },
  {
    "id": "engame",
    "filename": "engame.zip",
    "title": "Engame",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Engame",
    "linesCount": 5,
    "characters": [],
    "size": 171845399,
    "sizeFormatted": "163.9 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/engame.zip"
  },
  {
    "id": "eren_manipulates",
    "filename": "eren_manipulates.zip",
    "title": "Eren Manipulates",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Eren Manipulates",
    "linesCount": 5,
    "characters": [],
    "size": 72909518,
    "sizeFormatted": "69.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/eren_manipulates.zip"
  },
  {
    "id": "erwin_s_plan_aot_3_",
    "filename": "erwin_s_plan_aot_3_.zip",
    "title": "Erwin S Plan Aot 3",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Erwin S Plan Aot 3",
    "linesCount": 5,
    "characters": [],
    "size": 72463513,
    "sizeFormatted": "69.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/erwin_s_plan_aot_3_.zip"
  },
  {
    "id": "evil_dead_rise_bande_annonce_vf_",
    "filename": "evil_dead_rise_bande_annonce_vf_.zip",
    "title": "Evil Dead Rise Bande Annonce Vf",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Evil Dead Rise Bande Annonce Vf",
    "linesCount": 5,
    "characters": [],
    "size": 40066671,
    "sizeFormatted": "38.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/evil_dead_rise_bande_annonce_vf_.zip"
  },
  {
    "id": "forrest_gump_-_life_is_like_a_box_of_chocolates",
    "filename": "forrest_gump_-_life_is_like_a_box_of_chocolates.zip",
    "title": "Forrest Gump Life Is Like A Box Of Chocolates",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Forrest Gump Life Is Like A Box Of Chocolates",
    "linesCount": 5,
    "characters": [],
    "size": 53627602,
    "sizeFormatted": "51.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/forrest_gump_-_life_is_like_a_box_of_chocolates.zip"
  },
  {
    "id": "GIVE ME THE BALL",
    "filename": "GIVE ME THE BALL.zip",
    "title": "GIVE ME THE BALL",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: GIVE ME THE BALL",
    "linesCount": 5,
    "characters": [],
    "size": 246633065,
    "sizeFormatted": "235.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/GIVE%20ME%20THE%20BALL.zip"
  },
  {
    "id": "GOTG Vol 2 - Now I Know That Sounds Bad",
    "filename": "GOTG Vol 2 - Now I Know That Sounds Bad.zip",
    "title": "GOTG Vol 2 Now I Know That Sounds Bad",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: GOTG Vol 2 Now I Know That Sounds Bad",
    "linesCount": 5,
    "characters": [],
    "size": 236342447,
    "sizeFormatted": "225.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/GOTG%20Vol%202%20-%20Now%20I%20Know%20That%20Sounds%20Bad.zip"
  },
  {
    "id": "Guardians meet avengers",
    "filename": "Guardians meet avengers.zip",
    "title": "Guardians Meet Avengers",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Guardians Meet Avengers",
    "linesCount": 5,
    "characters": [],
    "size": 79137929,
    "sizeFormatted": "75.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Guardians%20meet%20avengers.zip"
  },
  {
    "id": "guardians_meet_avengers",
    "filename": "guardians_meet_avengers.zip",
    "title": "Guardians Meet Avengers",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Guardians Meet Avengers",
    "linesCount": 5,
    "characters": [],
    "size": 79059303,
    "sizeFormatted": "75.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/guardians_meet_avengers.zip"
  },
  {
    "id": "guardians_of_the_galaxy_vol_3_i_",
    "filename": "guardians_of_the_galaxy_vol_3_i_.zip",
    "title": "Guardians Of The Galaxy Vol 3 I",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Guardians Of The Galaxy Vol 3 I",
    "linesCount": 5,
    "characters": [],
    "size": 24195306,
    "sizeFormatted": "23.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/guardians_of_the_galaxy_vol_3_i_.zip"
  },
  {
    "id": "harrypotterduel",
    "filename": "harrypotterduel.zip",
    "title": "Harrypotterduel",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Harrypotterduel",
    "linesCount": 5,
    "characters": [],
    "size": 179428633,
    "sizeFormatted": "171.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/harrypotterduel.zip"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_1",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_1.zip",
    "title": "Harry Potter 4 Harry Vs Voldemort Pt 1",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Harry Potter 4 Harry Vs Voldemort Pt 1",
    "linesCount": 5,
    "characters": [],
    "size": 67414873,
    "sizeFormatted": "64.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/harry_potter_4_-_harry_vs_voldemort_pt_1.zip"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_2",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_2.zip",
    "title": "Harry Potter 4 Harry Vs Voldemort Pt 2",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Harry Potter 4 Harry Vs Voldemort Pt 2",
    "linesCount": 5,
    "characters": [],
    "size": 121083320,
    "sizeFormatted": "115.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/harry_potter_4_-_harry_vs_voldemort_pt_2.zip"
  },
  {
    "id": "harry_potter_train_scene",
    "filename": "harry_potter_train_scene.zip",
    "title": "Harry Potter Train Scene",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Harry Potter Train Scene",
    "linesCount": 5,
    "characters": [],
    "size": 20293488,
    "sizeFormatted": "19.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/harry_potter_train_scene.zip"
  },
  {
    "id": "homelander_vs_butcher",
    "filename": "homelander_vs_butcher.zip",
    "title": "Homelander Vs Butcher",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Homelander Vs Butcher",
    "linesCount": 5,
    "characters": [],
    "size": 18008127,
    "sizeFormatted": "17.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/homelander_vs_butcher.zip"
  },
  {
    "id": "i-m-tired-boss-the-green-mile-1999-nominee",
    "filename": "i-m-tired-boss-the-green-mile-1999-nominee.zip",
    "title": "I M Tired Boss The Green Mile 1999 Nominee",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: I M Tired Boss The Green Mile 1999 Nominee",
    "linesCount": 5,
    "characters": [],
    "size": 23288565,
    "sizeFormatted": "22.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/i-m-tired-boss-the-green-mile-1999-nominee.zip"
  },
  {
    "id": "ichigo_vs_byakuya_choicervoicer_54255",
    "filename": "ichigo_vs_byakuya_choicervoicer_54255.zip",
    "title": "Ichigo Vs Byakuya Choicervoicer 54255",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Ichigo Vs Byakuya Choicervoicer 54255",
    "linesCount": 5,
    "characters": [],
    "size": 61226559,
    "sizeFormatted": "58.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/ichigo_vs_byakuya_choicervoicer_54255.zip"
  },
  {
    "id": "incredibles_-_im_thirsty",
    "filename": "incredibles_-_im_thirsty.zip",
    "title": "Incredibles Im Thirsty",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Incredibles Im Thirsty",
    "linesCount": 5,
    "characters": [],
    "size": 67458892,
    "sizeFormatted": "64.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/incredibles_-_im_thirsty.zip"
  },
  {
    "id": "invincible_-_are_you_sure",
    "filename": "invincible_-_are_you_sure.zip",
    "title": "Invincible Are You Sure",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Invincible Are You Sure",
    "linesCount": 5,
    "characters": [],
    "size": 11566301,
    "sizeFormatted": "11.0 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/invincible_-_are_you_sure.zip"
  },
  {
    "id": "it-2017-pennywise-meets-georgie",
    "filename": "it-2017-pennywise-meets-georgie.zip",
    "title": "It 2017 Pennywise Meets Georgie",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: It 2017 Pennywise Meets Georgie",
    "linesCount": 5,
    "characters": [],
    "size": 39662490,
    "sizeFormatted": "37.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/it-2017-pennywise-meets-georgie.zip"
  },
  {
    "id": "i_robot_-_can_you_4c11c",
    "filename": "i_robot_-_can_you_4c11c.zip",
    "title": "I Robot Can You 4c11c",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: I Robot Can You 4c11c",
    "linesCount": 5,
    "characters": [],
    "size": 3868945,
    "sizeFormatted": "3.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/i_robot_-_can_you_4c11c.zip"
  },
  {
    "id": "jotaro_vs_dio",
    "filename": "jotaro_vs_dio.zip",
    "title": "Jotaro Vs Dio",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Jotaro Vs Dio",
    "linesCount": 5,
    "characters": [],
    "size": 105616788,
    "sizeFormatted": "100.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/jotaro_vs_dio.zip"
  },
  {
    "id": "kung_fu_panda_-_oogway_ascends",
    "filename": "kung_fu_panda_-_oogway_ascends.zip",
    "title": "Kung Fu Panda Oogway Ascends",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Kung Fu Panda Oogway Ascends",
    "linesCount": 5,
    "characters": [],
    "size": 87842233,
    "sizeFormatted": "83.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/kung_fu_panda_-_oogway_ascends.zip"
  },
  {
    "id": "kung_fu_panda_-_shifu_vs_tai_lung",
    "filename": "kung_fu_panda_-_shifu_vs_tai_lung.zip",
    "title": "Kung Fu Panda Shifu Vs Tai Lung",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Kung Fu Panda Shifu Vs Tai Lung",
    "linesCount": 5,
    "characters": [],
    "size": 132790504,
    "sizeFormatted": "126.6 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/kung_fu_panda_-_shifu_vs_tai_lung.zip"
  },
  {
    "id": "light_yagami_perfect_victory",
    "filename": "light_yagami_perfect_victory.zip",
    "title": "Light Yagami Perfect Victory",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Light Yagami Perfect Victory",
    "linesCount": 5,
    "characters": [],
    "size": 37504302,
    "sizeFormatted": "35.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/light_yagami_perfect_victory.zip"
  },
  {
    "id": "Loki in Germany Avengers 2012",
    "filename": "Loki in Germany Avengers 2012.zip",
    "title": "Loki In Germany Avengers 2012",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Loki In Germany Avengers 2012",
    "linesCount": 5,
    "characters": [],
    "size": 56946847,
    "sizeFormatted": "54.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Loki%20in%20Germany%20Avengers%202012.zip"
  },
  {
    "id": "minions_-_banana_song_barbara_ann_",
    "filename": "minions_-_banana_song_barbara_ann_.zip",
    "title": "Minions Banana Song Barbara Ann",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Minions Banana Song Barbara Ann",
    "linesCount": 5,
    "characters": [],
    "size": 47717035,
    "sizeFormatted": "45.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/minions_-_banana_song_barbara_ann_.zip"
  },
  {
    "id": "monsters_inc_-_waternoose_scandal_scene_6a3b5",
    "filename": "monsters_inc_-_waternoose_scandal_scene_6a3b5.zip",
    "title": "Monsters Inc Waternoose Scandal Scene 6a3b5",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Monsters Inc Waternoose Scandal Scene 6a3b5",
    "linesCount": 5,
    "characters": [],
    "size": 100160645,
    "sizeFormatted": "95.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/monsters_inc_-_waternoose_scandal_scene_6a3b5.zip"
  },
  {
    "id": "no_way_home",
    "filename": "no_way_home.zip",
    "title": "No Way Home",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: No Way Home",
    "linesCount": 5,
    "characters": [],
    "size": 81895474,
    "sizeFormatted": "78.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/no_way_home.zip"
  },
  {
    "id": "obsession_-_diner_scene_040e7",
    "filename": "obsession_-_diner_scene_040e7.zip",
    "title": "Obsession Diner Scene 040e7",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Obsession Diner Scene 040e7",
    "linesCount": 5,
    "characters": [],
    "size": 20416681,
    "sizeFormatted": "19.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/obsession_-_diner_scene_040e7.zip"
  },
  {
    "id": "pulp_fiction_-_say_what_again",
    "filename": "pulp_fiction_-_say_what_again.zip",
    "title": "Pulp Fiction Say What Again",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Pulp Fiction Say What Again",
    "linesCount": 5,
    "characters": [],
    "size": 36923034,
    "sizeFormatted": "35.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/pulp_fiction_-_say_what_again.zip"
  },
  {
    "id": "Spider-Man 2 - Could You Pay Me In Advance",
    "filename": "Spider-Man 2 - Could You Pay Me In Advance.zip",
    "title": "Spider Man 2 Could You Pay Me In Advance",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Spider Man 2 Could You Pay Me In Advance",
    "linesCount": 5,
    "characters": [],
    "size": 46832703,
    "sizeFormatted": "44.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Spider-Man%202%20-%20Could%20You%20Pay%20Me%20In%20Advance.zip"
  },
  {
    "id": "spider-man_3_rent_scene_modpack",
    "filename": "spider-man_3_rent_scene_modpack.zip",
    "title": "Spider Man 3 Rent Scene Modpack",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Spider Man 3 Rent Scene Modpack",
    "linesCount": 5,
    "characters": [],
    "size": 43404519,
    "sizeFormatted": "41.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/spider-man_3_rent_scene_modpack.zip"
  },
  {
    "id": "star_wars-i_am_your_father",
    "filename": "star_wars-i_am_your_father.zip",
    "title": "Star Wars I Am Your Father",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Star Wars I Am Your Father",
    "linesCount": 5,
    "characters": [],
    "size": 43457409,
    "sizeFormatted": "41.4 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/star_wars-i_am_your_father.zip"
  },
  {
    "id": "star_wars_-_you_turned_her_against_me_20ba1",
    "filename": "star_wars_-_you_turned_her_against_me_20ba1.zip",
    "title": "Star Wars You Turned Her Against Me 20ba1",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Star Wars You Turned Her Against Me 20ba1",
    "linesCount": 5,
    "characters": [],
    "size": 50355311,
    "sizeFormatted": "48.0 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/star_wars_-_you_turned_her_against_me_20ba1.zip"
  },
  {
    "id": "sukuna_awakens_in_shibuya_for_windows_zip_",
    "filename": "sukuna_awakens_in_shibuya_for_windows_zip_.zip",
    "title": "Sukuna Awakens In Shibuya For Windows Zip",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Sukuna Awakens In Shibuya For Windows Zip",
    "linesCount": 5,
    "characters": [],
    "size": 28070969,
    "sizeFormatted": "26.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/sukuna_awakens_in_shibuya_for_windows_zip_.zip"
  },
  {
    "id": "the_good_doctor_-_i_am_a_surgeon",
    "filename": "the_good_doctor_-_i_am_a_surgeon.zip",
    "title": "The Good Doctor I Am A Surgeon",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: The Good Doctor I Am A Surgeon",
    "linesCount": 5,
    "characters": [],
    "size": 62961885,
    "sizeFormatted": "60.0 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/the_good_doctor_-_i_am_a_surgeon.zip"
  },
  {
    "id": "Toji vs Gojo",
    "filename": "Toji vs Gojo.zip",
    "title": "Toji Vs Gojo",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Toji Vs Gojo",
    "linesCount": 5,
    "characters": [],
    "size": 27091222,
    "sizeFormatted": "25.8 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/Toji%20vs%20Gojo.zip"
  },
  {
    "id": "twilight_-_i_know_what_you_are_d9110",
    "filename": "twilight_-_i_know_what_you_are_d9110.zip",
    "title": "Twilight I Know What You Are D9110",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Twilight I Know What You Are D9110",
    "linesCount": 5,
    "characters": [],
    "size": 104816547,
    "sizeFormatted": "100.0 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/twilight_-_i_know_what_you_are_d9110.zip"
  },
  {
    "id": "what_is_your_name_5718b",
    "filename": "what_is_your_name_5718b.zip",
    "title": "What Is Your Name 5718b",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: What Is Your Name 5718b",
    "linesCount": 5,
    "characters": [],
    "size": 47312596,
    "sizeFormatted": "45.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/what_is_your_name_5718b.zip"
  },
  {
    "id": "white_chicks_-_a_thousand_miles",
    "filename": "white_chicks_-_a_thousand_miles.zip",
    "title": "White Chicks A Thousand Miles",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: White Chicks A Thousand Miles",
    "linesCount": 5,
    "characters": [],
    "size": 31793098,
    "sizeFormatted": "30.3 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/white_chicks_-_a_thousand_miles.zip"
  },
  {
    "id": "will_byers_coming_out",
    "filename": "will_byers_coming_out.zip",
    "title": "Will Byers Coming Out",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Will Byers Coming Out",
    "linesCount": 5,
    "characters": [],
    "size": 108735142,
    "sizeFormatted": "103.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/will_byers_coming_out.zip"
  },
  {
    "id": "you_are_a_toy",
    "filename": "you_are_a_toy.zip",
    "title": "You Are A Toy",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: You Are A Toy",
    "linesCount": 5,
    "characters": [],
    "size": 15835095,
    "sizeFormatted": "15.1 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/you_are_a_toy.zip"
  },
  {
    "id": "you_shall_not_pass_lotr_scene",
    "filename": "you_shall_not_pass_lotr_scene.zip",
    "title": "You Shall Not Pass Lotr Scene",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: You Shall Not Pass Lotr Scene",
    "linesCount": 5,
    "characters": [],
    "size": 48920992,
    "sizeFormatted": "46.7 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/you_shall_not_pass_lotr_scene.zip"
  },
  {
    "id": "ytdowncom_youtube_dementor_on_bo",
    "filename": "ytdowncom_youtube_dementor_on_bo.zip",
    "title": "Ytdowncom Youtube Dementor On Bo",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Ytdowncom Youtube Dementor On Bo",
    "linesCount": 5,
    "characters": [],
    "size": 101232070,
    "sizeFormatted": "96.5 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/ytdowncom_youtube_dementor_on_bo.zip"
  },
  {
    "id": "yu_and_mi_-_rush_hour",
    "filename": "yu_and_mi_-_rush_hour.zip",
    "title": "Yu And Mi Rush Hour",
    "author": "Choicer Voicer",
    "description": "Scene voice pack: Yu And Mi Rush Hour",
    "linesCount": 5,
    "characters": [],
    "size": 37954983,
    "sizeFormatted": "36.2 MB",
    "url": "https://pub-7d63b3d2ed6a4e379334dcfada056e24.r2.dev/yu_and_mi_-_rush_hour.zip"
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

  const [globalLoading, setGlobalLoading] = useState({ isOpen: false, percent: 0, title: '', subtext: '' });

  const loadPack = async (packId, packUrl) => {
    if (!packId) return;
    setSelectedPackId(packId);

    const foundPack = packs.find((p) => p.id === packId || p.filename === packId || p.filename === `${packId}.zip`);
    const r2Url = foundPack?.url || (packUrl && packUrl.startsWith('http') ? packUrl : null);
    const localUrl = `/packs/${encodeURIComponent(foundPack?.filename || `${packId}.zip`)}`;

    const targetUrl = r2Url || packUrl || localUrl;

    setGlobalLoading({
      isOpen: true,
      percent: 10,
      title: lang === 'en' ? 'Downloading Voice Pack...' : 'กำลังดาวน์โหลดฉากภาพและเสียงพากย์...',
      subtext: '10%'
    });

    try {
      let res = null;
      try {
        res = await fetch(targetUrl);
      } catch (err) {
        console.warn(`Primary fetch failed for ${targetUrl}, trying fallback...`, err);
      }

      if ((!res || !res.ok) && targetUrl !== localUrl) {
        try {
          console.log(`Retrying pack download with local URL: ${localUrl}`);
          res = await fetch(localUrl);
        } catch (err) {
          console.warn(`Fallback fetch failed for ${localUrl}`, err);
        }
      }

      if (res && res.ok) {
        setGlobalLoading({
          isOpen: true,
          percent: 30,
          title: lang === 'en' ? 'Processing Pack Archive...' : 'กำลังแตกไฟล์บทพากย์และวิดีโอ...',
          subtext: '30%'
        });

        const arrayBuffer = await res.arrayBuffer();
        const packData = await parseScenePackZip(arrayBuffer, (pct, status) => {
          setGlobalLoading({
            isOpen: true,
            percent: Math.max(30, Math.min(100, Math.round(pct))),
            title: lang === 'en' ? 'Loading Voice Pack...' : 'กำลังโหลดฉากภาพและเสียงพากย์...',
            subtext: status
          });
        });
        setActivePackData(packData);
        setCurrentLineIndex(0);
      } else {
        alert(lang === 'en' ? 'Failed to download pack archive. Please try another pack.' : 'ไม่สามารถดาวน์โหลดไฟล์บทพากย์ได้ กรุณาลองฉากอื่น');
      }
    } catch (err) {
      console.error('Error loading pack:', err);
    } finally {
      setTimeout(() => {
        setGlobalLoading({ isOpen: false, percent: 100, title: '', subtext: '' });
      }, 400);
    }
  };

  // Auto-load room's scene pack upon entering inGame view or joining room
  useEffect(() => {
    if (currentView === 'inGame' && activeRoom) {
      const roomPackId = activeRoom.packId || activeRoom.pack?.id;
      const foundPack = packs.find(p => p.id === roomPackId || p.filename === roomPackId || p.filename === `${roomPackId}.zip`);
      const roomPackUrl = activeRoom.pack?.url || foundPack?.url;

      if (roomPackId && selectedPackId !== roomPackId) {
        loadPack(roomPackId, roomPackUrl);
      } else if (!activePackData && roomPackId) {
        loadPack(roomPackId, roomPackUrl);
      }
    }
  }, [currentView, activeRoom?.packId, activeRoom?.pack?.id, activeRoom?.code]);

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

  // Merge local recorded takes with server-synced takes from other players in the room
  const mergedRecordedTakes = { ...recordedTakes };
  if (activeRoom && Array.isArray(activeRoom.takes)) {
    const code = activeRoom.code || activeRoom.roomCode;
    activeRoom.takes.forEach((t) => {
      if (t && typeof t.lineIndex === 'number' && !mergedRecordedTakes[t.lineIndex]) {
        mergedRecordedTakes[t.lineIndex] = `/api/rooms/${code}/takes/${t.lineIndex}?v=${t.version || 1}`;
      }
    });
  }

  const isRecordingBusyRef = React.useRef(false);

  // Audio recording handlers
  const handleToggleRecord = async () => {
    if (isRecordingBusyRef.current) return;
    isRecordingBusyRef.current = true;

    try {
      if (isRecording) {
        setIsRecording(false);
        const result = await audioEngine.stopRecording();
        if (result) {
          soundEffects.playRecordDoneSound();
          setRecordedTakes((prev) => ({
            ...prev,
            [currentLineIndex]: result.url,
          }));

          // Upload voice recording blob to server so everyone in the room can listen!
          if (activeRoom && result.blob) {
            const code = activeRoom.code || activeRoom.roomCode;
            try {
              const uploadRes = await fetch(`/api/rooms/${code}/takes/${currentLineIndex}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': result.blob.type || 'audio/webm',
                  'x-room-token': currentUser?.token || '',
                },
                body: result.blob,
              });
              if (uploadRes.ok) {
                const data = await uploadRes.json();
                if (data.state) {
                  setActiveRoom(data.state);
                }
              }
            } catch (err) {
              console.warn('Failed to upload recorded voice take to server:', err);
            }
          }

          // Stay on current line so player & friends can check recording with Play recording!
        }
      } else {
        await audioEngine.prepareRecording();
        soundEffects.playRecordStartSound();
        setIsRecording(true);
      }
    } finally {
      isRecordingBusyRef.current = false;
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
    const takeUrl = mergedRecordedTakes[currentLineIndex];
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

  const [hasMicrophone, setHasMicrophone] = useState(true);

  useEffect(() => {
    async function checkMic() {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const mics = devices.filter((d) => d.kind === 'audioinput');
          setHasMicrophone(mics.length > 0);
        } catch (e) {
          setHasMicrophone(true);
        }
      }
    }
    checkMic();
  }, []);

  // Line take status & Overwrite prevention rules
  const currentLineTakeObj = activeRoom?.takes?.find((t) => t.lineIndex === currentLineIndex);
  const isLineAlreadyRecorded = Boolean(mergedRecordedTakes[currentLineIndex]);
  const recorderName = currentLineTakeObj?.playerName || '';

  // Check turn ownership accurately:
  const currentTurnPlayerId = activeRoom?.currentTurnPlayerId || activeRoom?.players?.[0]?.id;
  const currentTurnPlayer = activeRoom?.players?.find(p => p.id === currentTurnPlayerId) || activeRoom?.players?.[0];

  const myPlayerId = activeRoom?.you?.id || currentUser?.id;
  const myPlayerName = activeRoom?.you?.name || currentUser?.name;

  const isMyTurn = Boolean(
    !activeRoom || // Solo mode: always your turn!
    (activeRoom?.players && activeRoom?.players?.length === 1) || // Single player room: always your turn!
    (currentTurnPlayer && (
      (currentTurnPlayerId && myPlayerId && currentTurnPlayerId === myPlayerId) ||
      (currentTurnPlayer.name && myPlayerName && currentTurnPlayer.name === myPlayerName) ||
      (currentTurnPlayer.name && myPlayerName && currentTurnPlayer.name.includes(myPlayerName))
    ))
  );

  const canRecordCurrentLine = hasMicrophone && !isLineAlreadyRecorded && isMyTurn;

  const prevIsMyTurnRef = React.useRef(false);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && currentView === 'inGame') {
      soundEffects.playYourTurnSound();
    }
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, currentView]);

  const handleNextTurn = async () => {
    const nextLineIdx = Math.min((activePackData?.lines?.length || 1) - 1, currentLineIndex + 1);
    setCurrentLineIndex(nextLineIdx);

    if (activeRoom) {
      const code = activeRoom.code || activeRoom.roomCode;
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-room-token': currentUser?.token || '',
          },
          body: JSON.stringify({
            action: 'next-turn',
            lineIndex: nextLineIdx,
            token: currentUser?.token || '',
            playerName: currentUser?.name || ''
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            setActiveRoom(data.state);
            if (typeof data.state.currentLineIndex === 'number') {
              setCurrentLineIndex(data.state.currentLineIndex);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to pass next turn to server:', err);
      }
    }
  };

  const computedActiveTurnIndex = activeRoom?.currentTurnPlayerId
    ? Math.max(0, playersList.findIndex(p => p.id === activeRoom.currentTurnPlayerId))
    : activeTurnIndex;

  const handlePassTurnToPlayer = async (targetId, targetName) => {
    if (targetId && playersList.length > 0) {
      const targetIdx = playersList.findIndex((p) => p.id === targetId || p.name === targetName);
      if (targetIdx !== -1) {
        setActiveTurnIndex(targetIdx);
      }
    }

    if (activeRoom && targetId) {
      const code = activeRoom.code || activeRoom.roomCode;
      try {
        const res = await fetch(`/api/rooms/${code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-room-token': currentUser?.token || '',
          },
          body: JSON.stringify({ action: 'pass-turn', targetPlayerId: targetId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            setActiveRoom(data.state);
          }
        }
      } catch (err) {
        console.warn('Failed to pass turn to target player:', err);
      }
    }
  };

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
              activeTurnIndex={computedActiveTurnIndex}
              players={playersList}
              currentUser={currentUser}
              onPassTurn={(targetId, targetName) => {
                if (targetId) {
                  handlePassTurnToPlayer(targetId, targetName);
                } else {
                  handleNextTurn();
                }
              }}
              onNextTurn={handleNextTurn}
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
                  recordedTakeUrl={mergedRecordedTakes[currentLineIndex]}
                  isPlaying={isPlayingAudio}
                  isRecording={isRecording}
                  onAutoStopRecord={handleToggleRecord}
                />
              </div>

              <div>
                <DubControls
                  currentLineIndex={currentLineIndex}
                  totalLines={activePackData?.lines?.length || 0}
                  recordedTakesCount={Object.keys(mergedRecordedTakes).length}
                  isRecording={isRecording}
                  hasRecordedTake={Boolean(mergedRecordedTakes[currentLineIndex])}
                  isMyTurn={isMyTurn}
                  canRecord={canRecordCurrentLine}
                  isAlreadyRecorded={isLineAlreadyRecorded}
                  recorderName={recorderName}
                  hasMicrophone={hasMicrophone}
                  onHearClip={handleHearClip}
                  onToggleRecord={handleToggleRecord}
                  onPlayRecording={handlePlayRecording}
                  onPrevClip={() => setCurrentLineIndex((prev) => Math.max(0, prev - 1))}
                  onNextClip={handleNextTurn}
                  onNextTurn={handleNextTurn}
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
        recordedTakes={mergedRecordedTakes}
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

      <Footer />

      <LoadingOverlay
        isOpen={globalLoading.isOpen}
        percent={globalLoading.percent}
        title={globalLoading.title}
        subtext={globalLoading.subtext}
      />
    </div>
  );
}
