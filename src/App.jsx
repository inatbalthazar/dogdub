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

  // Voice Effect states
  const [voicePreset, setVoicePreset] = useState('clean');
  const [voicePitch, setVoicePitch] = useState(0);
  const [voiceTone, setVoiceTone] = useState(0);
  const [voiceEcho, setVoiceEcho] = useState(0);

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
    "title": "Custom Voice Clip #1",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Custom Voice Clip #1",
    "linesCount": 5,
    "characters": [],
    "size": 49126895,
    "sizeFormatted": "46.9 MB",
    "url": "/api/packs/stream/-__09bf5.zip",
    "category": "Movie",
    "cover": "/pack-covers/-__09bf5.jpg"
  },
  {
    "id": "-__75374",
    "filename": "-__75374.zip",
    "title": "Custom Voice Clip #2",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Custom Voice Clip #2",
    "linesCount": 5,
    "characters": [],
    "size": 27857379,
    "sizeFormatted": "26.6 MB",
    "url": "/api/packs/stream/-__75374.zip",
    "category": "Movie",
    "cover": "/pack-covers/-__75374.jpg"
  },
  {
    "id": "300_-_this_is_sparta_",
    "filename": "300_-_this_is_sparta_.zip",
    "title": "300: This is Sparta!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: 300: This is Sparta!",
    "linesCount": 5,
    "characters": [],
    "size": 297625319,
    "sizeFormatted": "283.8 MB",
    "url": "/api/packs/stream/300_-_this_is_sparta_.zip",
    "category": "Movie",
    "cover": "/pack-covers/300_-_this_is_sparta_.png"
  },
  {
    "id": "annoying_orange_4a4e0",
    "filename": "annoying_orange_4a4e0.zip",
    "title": "Annoying Orange: Hey Apple!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Annoying Orange: Hey Apple!",
    "linesCount": 5,
    "characters": [],
    "size": 13952441,
    "sizeFormatted": "13.3 MB",
    "url": "/api/packs/stream/annoying_orange_4a4e0.zip",
    "category": "Movie",
    "cover": "/pack-covers/annoying_orange_4a4e0.png"
  },
  {
    "id": "Are you the Strongest",
    "filename": "Are you the Strongest.zip",
    "title": "Jujutsu Kaisen: Are You The Strongest?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Are You The Strongest?",
    "linesCount": 5,
    "characters": [],
    "size": 25449640,
    "sizeFormatted": "24.3 MB",
    "url": "/api/packs/stream/Are%20you%20the%20Strongest.zip",
    "category": "Anime",
    "cover": "/pack-covers/Are you the Strongest.png"
  },
  {
    "id": "attack_on_titan_-_you_traitor",
    "filename": "attack_on_titan_-_you_traitor.zip",
    "title": "Attack on Titan: You Traitor!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: You Traitor!",
    "linesCount": 5,
    "characters": [],
    "size": 188012205,
    "sizeFormatted": "179.3 MB",
    "url": "/api/packs/stream/attack_on_titan_-_you_traitor.zip",
    "category": "Anime",
    "cover": "/pack-covers/attack_on_titan_-_you_traitor.png"
  },
  {
    "id": "avengers_arguing",
    "filename": "avengers_arguing.zip",
    "title": "Avengers: Arguing Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers: Arguing Scene",
    "linesCount": 5,
    "characters": [],
    "size": 208966886,
    "sizeFormatted": "199.3 MB",
    "url": "/api/packs/stream/avengers_arguing.zip",
    "category": "Marvel",
    "cover": "/pack-covers/avengers_arguing.png"
  },
  {
    "id": "backrooms_-_dinner_scene_e80f0",
    "filename": "backrooms_-_dinner_scene_e80f0.zip",
    "title": "The Backrooms: Dinner Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Backrooms: Dinner Scene",
    "linesCount": 5,
    "characters": [],
    "size": 39495110,
    "sizeFormatted": "37.7 MB",
    "url": "/api/packs/stream/backrooms_-_dinner_scene_e80f0.zip",
    "category": "Horror",
    "cover": "/pack-covers/backrooms_-_dinner_scene_e80f0.png"
  },
  {
    "id": "batman_interrogates_the_joker_-_the_dark_knight_96d29",
    "filename": "batman_interrogates_the_joker_-_the_dark_knight_96d29.zip",
    "title": "The Dark Knight: Batman Interrogates Joker",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Dark Knight: Batman Interrogates Joker",
    "linesCount": 5,
    "characters": [],
    "size": 74649260,
    "sizeFormatted": "71.2 MB",
    "url": "/api/packs/stream/batman_interrogates_the_joker_-_the_dark_knight_96d29.zip",
    "category": "DC",
    "cover": "/pack-covers/batman_interrogates_the_joker_-_the_dark_knight_96d29.jpg"
  },
  {
    "id": "beyond_the_spiderverse_trailer_0d846",
    "filename": "beyond_the_spiderverse_trailer_0d846.zip",
    "title": "Spider-Man: Across the Spider-Verse",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man: Across the Spider-Verse",
    "linesCount": 5,
    "characters": [],
    "size": 108981486,
    "sizeFormatted": "103.9 MB",
    "url": "/api/packs/stream/beyond_the_spiderverse_trailer_0d846.zip",
    "category": "Marvel",
    "cover": "/pack-covers/beyond_the_spiderverse_trailer_0d846.png"
  },
  {
    "id": "Dexter - Cargo Scene",
    "filename": "Dexter - Cargo Scene.zip",
    "title": "Dexter: Surprise Motherfucker!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Dexter: Surprise Motherfucker!",
    "linesCount": 5,
    "characters": [],
    "size": 38113883,
    "sizeFormatted": "36.3 MB",
    "url": "/api/packs/stream/Dexter%20-%20Cargo%20Scene.zip",
    "category": "TV Series",
    "cover": "/pack-covers/Dexter - Cargo Scene.png"
  },
  {
    "id": "don_t_let_me_leave_murph",
    "filename": "don_t_let_me_leave_murph.zip",
    "title": "Interstellar: Don't Let Me Leave Murph!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Interstellar: Don't Let Me Leave Murph!",
    "linesCount": 5,
    "characters": [],
    "size": 37885013,
    "sizeFormatted": "36.1 MB",
    "url": "/api/packs/stream/don_t_let_me_leave_murph.zip",
    "category": "Movie",
    "cover": "/pack-covers/don_t_let_me_leave_murph.jpg"
  },
  {
    "id": "Elsa Flees From Arendelle",
    "filename": "Elsa Flees From Arendelle.zip",
    "title": "Frozen: Elsa Flees From Arendelle",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Frozen: Elsa Flees From Arendelle",
    "linesCount": 5,
    "characters": [],
    "size": 138054924,
    "sizeFormatted": "131.7 MB",
    "url": "/api/packs/stream/Elsa%20Flees%20From%20Arendelle.zip",
    "category": "Animation",
    "cover": "/pack-covers/Elsa Flees From Arendelle.png"
  },
  {
    "id": "engame",
    "filename": "engame.zip",
    "title": "Avengers: Endgame Final Battle",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers: Endgame Final Battle",
    "linesCount": 5,
    "characters": [],
    "size": 171845399,
    "sizeFormatted": "163.9 MB",
    "url": "/api/packs/stream/engame.zip",
    "category": "Marvel",
    "cover": "/pack-covers/engame.png"
  },
  {
    "id": "eren_manipulates",
    "filename": "eren_manipulates.zip",
    "title": "Attack on Titan: Eren Manipulates Grisha",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: Eren Manipulates Grisha",
    "linesCount": 5,
    "characters": [],
    "size": 72909518,
    "sizeFormatted": "69.5 MB",
    "url": "/api/packs/stream/eren_manipulates.zip",
    "category": "Anime",
    "cover": "/pack-covers/eren_manipulates.png"
  },
  {
    "id": "erwin_s_plan_aot_3_",
    "filename": "erwin_s_plan_aot_3_.zip",
    "title": "Attack on Titan: Erwin's Charge",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Attack on Titan: Erwin's Charge",
    "linesCount": 5,
    "characters": [],
    "size": 72463513,
    "sizeFormatted": "69.1 MB",
    "url": "/api/packs/stream/erwin_s_plan_aot_3_.zip",
    "category": "Anime",
    "cover": "/pack-covers/erwin_s_plan_aot_3_.jpg"
  },
  {
    "id": "evil_dead_rise_bande_annonce_vf_",
    "filename": "evil_dead_rise_bande_annonce_vf_.zip",
    "title": "Evil Dead Rise: Official Trailer",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Evil Dead Rise: Official Trailer",
    "linesCount": 5,
    "characters": [],
    "size": 40066671,
    "sizeFormatted": "38.2 MB",
    "url": "/api/packs/stream/evil_dead_rise_bande_annonce_vf_.zip",
    "category": "Horror",
    "cover": "/pack-covers/evil_dead_rise_bande_annonce_vf_.jpg"
  },
  {
    "id": "forrest_gump_-_life_is_like_a_box_of_chocolates",
    "filename": "forrest_gump_-_life_is_like_a_box_of_chocolates.zip",
    "title": "Forrest Gump: Box of Chocolates",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Forrest Gump: Box of Chocolates",
    "linesCount": 5,
    "characters": [],
    "size": 53627602,
    "sizeFormatted": "51.1 MB",
    "url": "/api/packs/stream/forrest_gump_-_life_is_like_a_box_of_chocolates.zip",
    "category": "Movie",
    "cover": "/pack-covers/forrest_gump_-_life_is_like_a_box_of_chocolates.jpg"
  },
  {
    "id": "GIVE ME THE BALL",
    "filename": "GIVE ME THE BALL.zip",
    "title": "Kuroko no Basket: Give Me The Ball!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kuroko no Basket: Give Me The Ball!",
    "linesCount": 5,
    "characters": [],
    "size": 246633065,
    "sizeFormatted": "235.2 MB",
    "url": "/api/packs/stream/GIVE%20ME%20THE%20BALL.zip",
    "category": "Anime",
    "cover": "/pack-covers/GIVE ME THE BALL.png"
  },
  {
    "id": "GOTG Vol 2 - Now I Know That Sounds Bad",
    "filename": "GOTG Vol 2 - Now I Know That Sounds Bad.zip",
    "title": "Guardians of the Galaxy Vol 2: Sounds Bad",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians of the Galaxy Vol 2: Sounds Bad",
    "linesCount": 5,
    "characters": [],
    "size": 236342447,
    "sizeFormatted": "225.4 MB",
    "url": "/api/packs/stream/GOTG%20Vol%202%20-%20Now%20I%20Know%20That%20Sounds%20Bad.zip",
    "category": "Marvel",
    "cover": "/pack-covers/GOTG Vol 2 - Now I Know That Sounds Bad.png"
  },
  {
    "id": "Guardians meet avengers",
    "filename": "Guardians meet avengers.zip",
    "title": "Guardians meet avengers",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians meet avengers",
    "linesCount": 5,
    "characters": [],
    "size": 79137929,
    "sizeFormatted": "75.5 MB",
    "url": "/api/packs/stream/Guardians%20meet%20avengers.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Guardians meet avengers.png"
  },
  {
    "id": "guardians_meet_avengers",
    "filename": "guardians_meet_avengers.zip",
    "title": "Guardians Meet Avengers",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians Meet Avengers",
    "linesCount": 5,
    "characters": [],
    "size": 79059303,
    "sizeFormatted": "75.4 MB",
    "url": "/api/packs/stream/guardians_meet_avengers.zip",
    "category": "Marvel",
    "cover": "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop"
  },
  {
    "id": "guardians_of_the_galaxy_vol_3_i_",
    "filename": "guardians_of_the_galaxy_vol_3_i_.zip",
    "title": "Guardians of the Galaxy Vol 3: Final Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Guardians of the Galaxy Vol 3: Final Scene",
    "linesCount": 5,
    "characters": [],
    "size": 24195306,
    "sizeFormatted": "23.1 MB",
    "url": "/api/packs/stream/guardians_of_the_galaxy_vol_3_i_.zip",
    "category": "Marvel",
    "cover": "/pack-covers/guardians_of_the_galaxy_vol_3_i_.jpg"
  },
  {
    "id": "harrypotterduel",
    "filename": "harrypotterduel.zip",
    "title": "Harry Potter: Duelling Club",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Duelling Club",
    "linesCount": 5,
    "characters": [],
    "size": 179428633,
    "sizeFormatted": "171.1 MB",
    "url": "/api/packs/stream/harrypotterduel.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harrypotterduel.png"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_1",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_1.zip",
    "title": "Harry Potter 4: Harry vs Voldemort Part 1",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter 4: Harry vs Voldemort Part 1",
    "linesCount": 5,
    "characters": [],
    "size": 67414873,
    "sizeFormatted": "64.3 MB",
    "url": "/api/packs/stream/harry_potter_4_-_harry_vs_voldemort_pt_1.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_4_-_harry_vs_voldemort_pt_1.png"
  },
  {
    "id": "harry_potter_4_-_harry_vs_voldemort_pt_2",
    "filename": "harry_potter_4_-_harry_vs_voldemort_pt_2.zip",
    "title": "Harry Potter 4: Harry vs Voldemort Part 2",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter 4: Harry vs Voldemort Part 2",
    "linesCount": 5,
    "characters": [],
    "size": 121083320,
    "sizeFormatted": "115.5 MB",
    "url": "/api/packs/stream/harry_potter_4_-_harry_vs_voldemort_pt_2.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_4_-_harry_vs_voldemort_pt_2.png"
  },
  {
    "id": "harry_potter_train_scene",
    "filename": "harry_potter_train_scene.zip",
    "title": "Harry Potter: Hogwarts Express Train",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Hogwarts Express Train",
    "linesCount": 5,
    "characters": [],
    "size": 20293488,
    "sizeFormatted": "19.4 MB",
    "url": "/api/packs/stream/harry_potter_train_scene.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/harry_potter_train_scene.jpg"
  },
  {
    "id": "homelander_vs_butcher",
    "filename": "homelander_vs_butcher.zip",
    "title": "The Boys: Homelander vs Butcher",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Boys: Homelander vs Butcher",
    "linesCount": 5,
    "characters": [],
    "size": 18008127,
    "sizeFormatted": "17.2 MB",
    "url": "/api/packs/stream/homelander_vs_butcher.zip",
    "category": "TV Series",
    "cover": "/pack-covers/homelander_vs_butcher.jpg"
  },
  {
    "id": "i-m-tired-boss-the-green-mile-1999-nominee",
    "filename": "i-m-tired-boss-the-green-mile-1999-nominee.zip",
    "title": "The Green Mile: I'm Tired Boss",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Green Mile: I'm Tired Boss",
    "linesCount": 5,
    "characters": [],
    "size": 23288565,
    "sizeFormatted": "22.2 MB",
    "url": "/api/packs/stream/i-m-tired-boss-the-green-mile-1999-nominee.zip",
    "category": "Movie",
    "cover": "/pack-covers/i-m-tired-boss-the-green-mile-1999-nominee.jpg"
  },
  {
    "id": "ichigo_vs_byakuya_choicervoicer_54255",
    "filename": "ichigo_vs_byakuya_choicervoicer_54255.zip",
    "title": "Bleach: Ichigo vs Byakuya Bankai",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Bleach: Ichigo vs Byakuya Bankai",
    "linesCount": 5,
    "characters": [],
    "size": 61226559,
    "sizeFormatted": "58.4 MB",
    "url": "/api/packs/stream/ichigo_vs_byakuya_choicervoicer_54255.zip",
    "category": "Anime",
    "cover": "/pack-covers/ichigo_vs_byakuya_choicervoicer_54255.png"
  },
  {
    "id": "incredibles_-_im_thirsty",
    "filename": "incredibles_-_im_thirsty.zip",
    "title": "The Incredibles: Where is My Super Suit?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Incredibles: Where is My Super Suit?",
    "linesCount": 5,
    "characters": [],
    "size": 67458892,
    "sizeFormatted": "64.3 MB",
    "url": "/api/packs/stream/incredibles_-_im_thirsty.zip",
    "category": "Animation",
    "cover": "/pack-covers/incredibles_-_im_thirsty.png"
  },
  {
    "id": "invincible_-_are_you_sure",
    "filename": "invincible_-_are_you_sure.zip",
    "title": "Invincible: Think Mark!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Invincible: Think Mark!",
    "linesCount": 5,
    "characters": [],
    "size": 11566301,
    "sizeFormatted": "11.0 MB",
    "url": "/api/packs/stream/invincible_-_are_you_sure.zip",
    "category": "Movie",
    "cover": "/pack-covers/invincible_-_are_you_sure.png"
  },
  {
    "id": "it-2017-pennywise-meets-georgie",
    "filename": "it-2017-pennywise-meets-georgie.zip",
    "title": "IT (2017): Pennywise Meets Georgie",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: IT (2017): Pennywise Meets Georgie",
    "linesCount": 5,
    "characters": [],
    "size": 39662490,
    "sizeFormatted": "37.8 MB",
    "url": "/api/packs/stream/it-2017-pennywise-meets-georgie.zip",
    "category": "Horror",
    "cover": "/pack-covers/it-2017-pennywise-meets-georgie.jpg"
  },
  {
    "id": "i_robot_-_can_you_4c11c",
    "filename": "i_robot_-_can_you_4c11c.zip",
    "title": "I, Robot: Can a Robot Write a Symphony?",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: I, Robot: Can a Robot Write a Symphony?",
    "linesCount": 5,
    "characters": [],
    "size": 3868945,
    "sizeFormatted": "3.7 MB",
    "url": "/api/packs/stream/i_robot_-_can_you_4c11c.zip",
    "category": "Movie",
    "cover": "/pack-covers/i_robot_-_can_you_4c11c.png"
  },
  {
    "id": "jotaro_vs_dio",
    "filename": "jotaro_vs_dio.zip",
    "title": "JoJo's Bizarre Adventure: Jotaro vs DIO",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: JoJo's Bizarre Adventure: Jotaro vs DIO",
    "linesCount": 5,
    "characters": [],
    "size": 105616788,
    "sizeFormatted": "100.7 MB",
    "url": "/api/packs/stream/jotaro_vs_dio.zip",
    "category": "Anime",
    "cover": "/pack-covers/jotaro_vs_dio.png"
  },
  {
    "id": "kung_fu_panda_-_oogway_ascends",
    "filename": "kung_fu_panda_-_oogway_ascends.zip",
    "title": "Kung Fu Panda: Master Oogway Ascends",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kung Fu Panda: Master Oogway Ascends",
    "linesCount": 5,
    "characters": [],
    "size": 87842233,
    "sizeFormatted": "83.8 MB",
    "url": "/api/packs/stream/kung_fu_panda_-_oogway_ascends.zip",
    "category": "Animation",
    "cover": "/pack-covers/kung_fu_panda_-_oogway_ascends.png"
  },
  {
    "id": "kung_fu_panda_-_shifu_vs_tai_lung",
    "filename": "kung_fu_panda_-_shifu_vs_tai_lung.zip",
    "title": "Kung Fu Panda: Shifu vs Tai Lung",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Kung Fu Panda: Shifu vs Tai Lung",
    "linesCount": 5,
    "characters": [],
    "size": 132790504,
    "sizeFormatted": "126.6 MB",
    "url": "/api/packs/stream/kung_fu_panda_-_shifu_vs_tai_lung.zip",
    "category": "Animation",
    "cover": "/pack-covers/kung_fu_panda_-_shifu_vs_tai_lung.png"
  },
  {
    "id": "light_yagami_perfect_victory",
    "filename": "light_yagami_perfect_victory.zip",
    "title": "light yagami perfect victory",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: light yagami perfect victory",
    "linesCount": 5,
    "characters": [],
    "size": 37504302,
    "sizeFormatted": "35.8 MB",
    "url": "/api/packs/stream/light_yagami_perfect_victory.zip",
    "category": "Movie",
    "cover": "/pack-covers/light_yagami_perfect_victory.png"
  },
  {
    "id": "Loki in Germany Avengers 2012",
    "filename": "Loki in Germany Avengers 2012.zip",
    "title": "Avengers (2012): Loki in Germany",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Avengers (2012): Loki in Germany",
    "linesCount": 5,
    "characters": [],
    "size": 56946847,
    "sizeFormatted": "54.3 MB",
    "url": "/api/packs/stream/Loki%20in%20Germany%20Avengers%202012.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Loki in Germany Avengers 2012.png"
  },
  {
    "id": "minions_-_banana_song_barbara_ann_",
    "filename": "minions_-_banana_song_barbara_ann_.zip",
    "title": "Minions: Banana Song",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Minions: Banana Song",
    "linesCount": 5,
    "characters": [],
    "size": 47717035,
    "sizeFormatted": "45.5 MB",
    "url": "/api/packs/stream/minions_-_banana_song_barbara_ann_.zip",
    "category": "Animation",
    "cover": "/pack-covers/minions_-_banana_song_barbara_ann_.png"
  },
  {
    "id": "monsters_inc_-_waternoose_scandal_scene_6a3b5",
    "filename": "monsters_inc_-_waternoose_scandal_scene_6a3b5.zip",
    "title": "Monsters, Inc.: Waternoose Scandal",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Monsters, Inc.: Waternoose Scandal",
    "linesCount": 5,
    "characters": [],
    "size": 100160645,
    "sizeFormatted": "95.5 MB",
    "url": "/api/packs/stream/monsters_inc_-_waternoose_scandal_scene_6a3b5.zip",
    "category": "Animation",
    "cover": "/pack-covers/monsters_inc_-_waternoose_scandal_scene_6a3b5.png"
  },
  {
    "id": "no_way_home",
    "filename": "no_way_home.zip",
    "title": "Spider-Man: No Way Home",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man: No Way Home",
    "linesCount": 5,
    "characters": [],
    "size": 81895474,
    "sizeFormatted": "78.1 MB",
    "url": "/api/packs/stream/no_way_home.zip",
    "category": "Marvel",
    "cover": "/pack-covers/no_way_home.png"
  },
  {
    "id": "obsession_-_diner_scene_040e7",
    "filename": "obsession_-_diner_scene_040e7.zip",
    "title": "Whiplash: Diner Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Whiplash: Diner Scene",
    "linesCount": 5,
    "characters": [],
    "size": 20416681,
    "sizeFormatted": "19.5 MB",
    "url": "/api/packs/stream/obsession_-_diner_scene_040e7.zip",
    "category": "Movie",
    "cover": "/pack-covers/obsession_-_diner_scene_040e7.png"
  },
  {
    "id": "pulp_fiction_-_say_what_again",
    "filename": "pulp_fiction_-_say_what_again.zip",
    "title": "Pulp Fiction: Say What Again!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Pulp Fiction: Say What Again!",
    "linesCount": 5,
    "characters": [],
    "size": 36923034,
    "sizeFormatted": "35.2 MB",
    "url": "/api/packs/stream/pulp_fiction_-_say_what_again.zip",
    "category": "Movie",
    "cover": "/pack-covers/pulp_fiction_-_say_what_again.png"
  },
  {
    "id": "Spider-Man 2 - Could You Pay Me In Advance",
    "filename": "Spider-Man 2 - Could You Pay Me In Advance.zip",
    "title": "Spider-Man 2: Pay Me In Advance",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man 2: Pay Me In Advance",
    "linesCount": 5,
    "characters": [],
    "size": 46832703,
    "sizeFormatted": "44.7 MB",
    "url": "/api/packs/stream/Spider-Man%202%20-%20Could%20You%20Pay%20Me%20In%20Advance.zip",
    "category": "Marvel",
    "cover": "/pack-covers/Spider-Man 2 - Could You Pay Me In Advance.png"
  },
  {
    "id": "spider-man_3_rent_scene_modpack",
    "filename": "spider-man_3_rent_scene_modpack.zip",
    "title": "Spider-Man 3: Give Me Rent!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Spider-Man 3: Give Me Rent!",
    "linesCount": 5,
    "characters": [],
    "size": 43404519,
    "sizeFormatted": "41.4 MB",
    "url": "/api/packs/stream/spider-man_3_rent_scene_modpack.zip",
    "category": "Marvel",
    "cover": "/pack-covers/spider-man_3_rent_scene_modpack.png"
  },
  {
    "id": "star_wars-i_am_your_father",
    "filename": "star_wars-i_am_your_father.zip",
    "title": "Star Wars: I Am Your Father",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Star Wars: I Am Your Father",
    "linesCount": 5,
    "characters": [],
    "size": 43457409,
    "sizeFormatted": "41.4 MB",
    "url": "/api/packs/stream/star_wars-i_am_your_father.zip",
    "category": "Movie",
    "cover": "/pack-covers/star_wars-i_am_your_father.png"
  },
  {
    "id": "star_wars_-_you_turned_her_against_me_20ba1",
    "filename": "star_wars_-_you_turned_her_against_me_20ba1.zip",
    "title": "Star Wars: You Turned Her Against Me!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Star Wars: You Turned Her Against Me!",
    "linesCount": 5,
    "characters": [],
    "size": 50355311,
    "sizeFormatted": "48.0 MB",
    "url": "/api/packs/stream/star_wars_-_you_turned_her_against_me_20ba1.zip",
    "category": "Movie",
    "cover": "/pack-covers/star_wars_-_you_turned_her_against_me_20ba1.png"
  },
  {
    "id": "sukuna_awakens_in_shibuya_for_windows_zip_",
    "filename": "sukuna_awakens_in_shibuya_for_windows_zip_.zip",
    "title": "Jujutsu Kaisen: Sukuna Awakens in Shibuya",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Sukuna Awakens in Shibuya",
    "linesCount": 5,
    "characters": [],
    "size": 28070969,
    "sizeFormatted": "26.8 MB",
    "url": "/api/packs/stream/sukuna_awakens_in_shibuya_for_windows_zip_.zip",
    "category": "Anime",
    "cover": "/pack-covers/sukuna_awakens_in_shibuya_for_windows_zip_.png"
  },
  {
    "id": "the_good_doctor_-_i_am_a_surgeon",
    "filename": "the_good_doctor_-_i_am_a_surgeon.zip",
    "title": "The Good Doctor: I Am A Surgeon!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: The Good Doctor: I Am A Surgeon!",
    "linesCount": 5,
    "characters": [],
    "size": 62961885,
    "sizeFormatted": "60.0 MB",
    "url": "/api/packs/stream/the_good_doctor_-_i_am_a_surgeon.zip",
    "category": "TV Series",
    "cover": "/pack-covers/the_good_doctor_-_i_am_a_surgeon.png"
  },
  {
    "id": "Toji vs Gojo",
    "filename": "Toji vs Gojo.zip",
    "title": "Jujutsu Kaisen: Toji vs Gojo",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Jujutsu Kaisen: Toji vs Gojo",
    "linesCount": 5,
    "characters": [],
    "size": 27091222,
    "sizeFormatted": "25.8 MB",
    "url": "/api/packs/stream/Toji%20vs%20Gojo.zip",
    "category": "Anime",
    "cover": "/pack-covers/Toji vs Gojo.png"
  },
  {
    "id": "twilight_-_i_know_what_you_are_d9110",
    "filename": "twilight_-_i_know_what_you_are_d9110.zip",
    "title": "Twilight: I Know What You Are",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Twilight: I Know What You Are",
    "linesCount": 5,
    "characters": [],
    "size": 104816547,
    "sizeFormatted": "100.0 MB",
    "url": "/api/packs/stream/twilight_-_i_know_what_you_are_d9110.zip",
    "category": "Movie",
    "cover": "/pack-covers/twilight_-_i_know_what_you_are_d9110.png"
  },
  {
    "id": "what_is_your_name_5718b",
    "filename": "what_is_your_name_5718b.zip",
    "title": "Your Name (Kimi no Na wa)",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Your Name (Kimi no Na wa)",
    "linesCount": 5,
    "characters": [],
    "size": 47312596,
    "sizeFormatted": "45.1 MB",
    "url": "/api/packs/stream/what_is_your_name_5718b.zip",
    "category": "Anime",
    "cover": "/pack-covers/what_is_your_name_5718b.png"
  },
  {
    "id": "white_chicks_-_a_thousand_miles",
    "filename": "white_chicks_-_a_thousand_miles.zip",
    "title": "White Chicks: A Thousand Miles",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: White Chicks: A Thousand Miles",
    "linesCount": 5,
    "characters": [],
    "size": 31793098,
    "sizeFormatted": "30.3 MB",
    "url": "/api/packs/stream/white_chicks_-_a_thousand_miles.zip",
    "category": "Movie",
    "cover": "/pack-covers/white_chicks_-_a_thousand_miles.png"
  },
  {
    "id": "will_byers_coming_out",
    "filename": "will_byers_coming_out.zip",
    "title": "Stranger Things: Will Byers Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Stranger Things: Will Byers Scene",
    "linesCount": 5,
    "characters": [],
    "size": 108735142,
    "sizeFormatted": "103.7 MB",
    "url": "/api/packs/stream/will_byers_coming_out.zip",
    "category": "TV Series",
    "cover": "/pack-covers/will_byers_coming_out.jpg"
  },
  {
    "id": "you_are_a_toy",
    "filename": "you_are_a_toy.zip",
    "title": "Toy Story: You Are A Toy!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Toy Story: You Are A Toy!",
    "linesCount": 5,
    "characters": [],
    "size": 15835095,
    "sizeFormatted": "15.1 MB",
    "url": "/api/packs/stream/you_are_a_toy.zip",
    "category": "Animation",
    "cover": "/pack-covers/you_are_a_toy.png"
  },
  {
    "id": "you_shall_not_pass_lotr_scene",
    "filename": "you_shall_not_pass_lotr_scene.zip",
    "title": "Lord of the Rings: You Shall Not Pass!",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Lord of the Rings: You Shall Not Pass!",
    "linesCount": 5,
    "characters": [],
    "size": 48920992,
    "sizeFormatted": "46.7 MB",
    "url": "/api/packs/stream/you_shall_not_pass_lotr_scene.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/you_shall_not_pass_lotr_scene.jpg"
  },
  {
    "id": "ytdowncom_youtube_dementor_on_bo",
    "filename": "ytdowncom_youtube_dementor_on_bo.zip",
    "title": "Harry Potter: Dementor on the Train",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Harry Potter: Dementor on the Train",
    "linesCount": 5,
    "characters": [],
    "size": 101232070,
    "sizeFormatted": "96.5 MB",
    "url": "/api/packs/stream/ytdowncom_youtube_dementor_on_bo.zip",
    "category": "Fantasy",
    "cover": "/pack-covers/ytdowncom_youtube_dementor_on_bo.jpg"
  },
  {
    "id": "yu_and_mi_-_rush_hour",
    "filename": "yu_and_mi_-_rush_hour.zip",
    "title": "Rush Hour 3: Yu and Mi Scene",
    "author": "Choicer Voicer",
    "description": "GameBanana scene voice pack: Rush Hour 3: Yu and Mi Scene",
    "linesCount": 5,
    "characters": [],
    "size": 37954983,
    "sizeFormatted": "36.2 MB",
    "url": "/api/packs/stream/yu_and_mi_-_rush_hour.zip",
    "category": "Movie",
    "cover": "/pack-covers/yu_and_mi_-_rush_hour.png"
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
        if (result && result.blob) {
          soundEffects.playRecordDoneSound();

          let finalBlob = result.blob;
          let finalUrl = result.url;

          // Apply selected Voice Effect preset / fine-tuning!
          if (voicePreset !== 'clean' || voicePitch !== 0 || voiceTone !== 0 || voiceEcho !== 0) {
            try {
              console.log(`Applying voice effect: preset=${voicePreset}, pitch=${voicePitch}, tone=${voiceTone}, echo=${voiceEcho}`);
              const effectResult = await audioEngine.applyVoiceEffect(result.blob, voicePreset, {
                pitch: voicePitch,
                tone: voiceTone,
                echo: voiceEcho,
              });
              if (effectResult && effectResult.url) {
                finalBlob = effectResult.blob;
                finalUrl = effectResult.url;
              }
            } catch (err) {
              console.warn('Voice effect application failed, falling back to raw recording:', err);
            }
          }

          setRecordedTakes((prev) => ({
            ...prev,
            [currentLineIndex]: finalUrl,
          }));

          // Upload voice recording blob to server so everyone in the room can listen!
          if (activeRoom && finalBlob) {
            const code = activeRoom.code || activeRoom.roomCode;
            try {
              const uploadRes = await fetch(`/api/rooms/${code}/takes/${currentLineIndex}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': finalBlob.type || 'audio/wav',
                  'x-room-token': currentUser?.token || '',
                },
                body: finalBlob,
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
    (activeRoom?.players && activeRoom?.players?.length <= 1) || // Single player room: always your turn!
    (activeRoom?.you && activeRoom?.you?.isHost && (!activeRoom.players || activeRoom.players.length <= 1)) ||
    (currentTurnPlayer && (
      (currentTurnPlayerId && myPlayerId && currentTurnPlayerId === myPlayerId) ||
      (currentTurnPlayer.name && myPlayerName && currentTurnPlayer.name.trim().toLowerCase() === myPlayerName.trim().toLowerCase()) ||
      (currentTurnPlayer.name && myPlayerName && currentTurnPlayer.name.toLowerCase().includes(myPlayerName.toLowerCase())) ||
      (currentTurnPlayer.name && myPlayerName && myPlayerName.toLowerCase().includes(currentTurnPlayer.name.toLowerCase()))
    ))
  );

  const canRecordCurrentLine = hasMicrophone && isMyTurn;

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
            onOpenCreateModal={(pack) => {
              if (pack && pack.id) setSelectedPackId(pack.id);
              setIsCreateModalOpen(true);
            }}
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
            t={t}
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
                  voicePreset={voicePreset}
                  onPresetChange={setVoicePreset}
                  voicePitch={voicePitch}
                  onPitchChange={setVoicePitch}
                  voiceTone={voiceTone}
                  onToneChange={setVoiceTone}
                  voiceEcho={voiceEcho}
                  onEchoChange={setVoiceEcho}
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
        defaultPackId={selectedPackId}
        t={t}
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
        t={t}
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
