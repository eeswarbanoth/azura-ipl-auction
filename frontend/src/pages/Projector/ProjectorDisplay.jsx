import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

// Socket URL from env — falls back to localhost for dev
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function ProjectorDisplay() {
  const [state, setState]           = useState(null);
  const [soldEvent, setSoldEvent]   = useState(null);
  const [unsoldEvent, setUnsoldEvent] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    // ── Create socket inside effect so it's properly scoped ──
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    // Initial data fetch
    const fetchInitialState = async () => {
      try {
        const res = await api.get('/auction/state');
        setState(res.data);
      } catch (err) {
        console.error('Failed to fetch initial auction state:', err);
      }
    };
    fetchInitialState();

    // Window resize
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);

    // Socket listeners
    socket.on('auction_state_updated', (newState) => {
      setState(newState);
      if (newState.currentPlayerId) {
        setSoldEvent(null);
        setUnsoldEvent(null);
      }
    });

    socket.on('player_sold', (data) => {
      setSoldEvent(data);
      playGavelSound();
    });

    socket.on('player_unsold', (data) => {
      setUnsoldEvent(data);
      playBuzzerSound();
    });

    // ── Cleanup: remove listeners & disconnect socket ──
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('auction_state_updated');
      socket.off('player_sold');
      socket.off('player_unsold');
      socket.disconnect();
    };
  }, []);

  const playGavelSound = () => {
    try {
      const audio = new Audio('/hammer.mp3');
      audio.play().catch(() => {}); // Silently ignore if file absent
    } catch (_) {}
  };

  const playBuzzerSound = () => {
    try {
      const audio = new Audio('/buzzer.mp3');
      audio.play().catch(() => {});
    } catch (_) {}
  };

  const cp = state?.currentPlayerId;

  return (
    <div className="relative min-h-screen bg-[#070b19] overflow-hidden flex flex-col items-center justify-center font-sans tracking-wide">

      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-neonBlue rounded-full mix-blend-screen filter blur-[200px] opacity-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-neonRed rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />

      <header className="absolute top-8 left-12 right-12 flex justify-between items-center z-10">
        <h1 className="text-4xl font-bold font-display text-white tracking-widest uppercase">
          <span className="neon-text-blue">IPL</span> <span className="neon-text-gold">Auction 2026</span>
        </h1>
        {cp && !soldEvent && !unsoldEvent && (
          <div className="px-6 py-2 bg-red-600 animate-pulse text-white font-bold tracking-widest uppercase rounded-full border-2 border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.6)]">
            LIVE BIDDING
          </div>
        )}
      </header>

      {/* Confetti on sold */}
      {soldEvent && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={800}
          gravity={0.15}
          colors={['#ffd700', '#00f3ff', '#ffffff']}
        />
      )}

      <AnimatePresence mode="wait">

        {/* SOLD EVENT */}
        {soldEvent && (
          <motion.div
            key="sold"
            initial={{ scale: 0.5, opacity: 0, rotateX: 90 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="z-20 text-center bg-black/40 backdrop-blur-md p-16 rounded-[3rem] border-4 border-gold shadow-[0_0_100px_rgba(255,215,0,0.3)] w-11/12 max-w-5xl relative overflow-hidden"
          >
            <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 w-full h-[200px] bg-gold opacity-20 filter blur-[100px]" />
            <motion.h2
              initial={{ y: -50 }} animate={{ y: 0 }} transition={{ delay: 0.3, type: 'spring' }}
              className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-8 uppercase tracking-widest drop-shadow-2xl"
            >
              {soldEvent.player.name}
            </motion.h2>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="mb-12">
              <span className="text-9xl font-black font-mono text-gold neon-text-gold tracking-tighter">
                {formatCurrency(soldEvent.soldPrice)}
              </span>
            </motion.div>
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}
              className="mt-8"
            >
              <p className="text-3xl text-gray-400 uppercase tracking-widest font-bold mb-4">Sold to</p>
              <h3 className="text-6xl text-white font-bold tracking-wider relative inline-block pb-2 border-b-4 border-neonBlue shadow-[0_10px_0_0_rgba(0,243,255,0.2)]">
                {soldEvent.team.name}
              </h3>
            </motion.div>
          </motion.div>
        )}

        {/* UNSOLD EVENT */}
        {unsoldEvent && !soldEvent && (
          <motion.div
            key="unsold"
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="z-20 text-center bg-red-900/20 backdrop-blur-md p-16 rounded-[3rem] border-4 border-red-600 shadow-[0_0_100px_rgba(255,0,0,0.3)] w-11/12 max-w-5xl"
          >
            <h2 className="text-8xl font-black text-white mb-8 tracking-widest uppercase">
              {unsoldEvent.player.name}
            </h2>
            <div className="border-t-4 border-red-500 my-8 w-1/2 mx-auto" />
            <h3 className="text-[150px] font-black text-red-500 neon-text-red uppercase tracking-tighter leading-none mt-4 transform -skew-x-12">
              UNSOLD
            </h3>
          </motion.div>
        )}

        {/* ACTIVE PLAYER */}
        {cp && !soldEvent && !unsoldEvent && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="z-20 w-11/12 max-w-[80vw] flex"
          >
            {/* Player Card */}
            <div className="flex-1 bg-secondary/80 backdrop-blur-xl border border-gray-700/50 rounded-l-[3rem] p-16 border-r-0 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-full h-[400px] bg-neonBlue opacity-5 filter blur-[150px]" />
              <div className="inline-block px-6 py-2 bg-gray-800 text-gray-300 border border-gray-600 rounded-full text-xl font-bold tracking-widest mb-10 uppercase shadow-lg">
                Lot #{(state?.queue?.length ?? 0) + 1}
              </div>
              <h2 className="text-[7rem] font-black text-white leading-none tracking-tight mb-6" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                {cp.name}
              </h2>
              <div className="flex items-center gap-6 mb-12">
                <span className="px-6 py-2 bg-neonBlue/10 text-neonBlue border border-neonBlue/40 rounded-xl text-3xl font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                  {cp.category}
                </span>
                <span className="text-3xl text-gold font-bold flex items-center gap-1 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)] font-mono">
                  {cp.rating}/100
                </span>
              </div>
            </div>

            {/* Price Panel */}
            <div className="w-[450px] bg-gradient-to-b from-gray-900 to-black border-l-2 border-gray-800 rounded-r-[3rem] p-12 flex flex-col justify-center items-center shadow-2xl relative">
              <div className="text-center">
                <p className="text-2xl text-gray-500 font-bold uppercase tracking-[0.3em] mb-4">Base Price</p>
                <h3 className="text-7xl font-mono font-black text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                  {formatCurrency(cp.basePrice)}
                </h3>
              </div>
              {cp.category === 'Marquee' && (
                <div className="absolute bottom-12 w-full text-center">
                  <span className="text-gold font-bold tracking-widest uppercase border border-gold/30 px-6 py-3 rounded-full bg-gold/10 text-xl animate-pulse">Marquee Player</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* WAITING */}
        {!cp && !soldEvent && !unsoldEvent && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-20 text-center"
          >
            <div className="w-48 h-48 border-4 border-gray-800 border-t-neonBlue rounded-full animate-spin mx-auto mb-10 opacity-70" />
            <h2 className="text-5xl font-light text-gray-400 tracking-widest uppercase mb-4">Auction Paused</h2>
            <p className="text-2xl text-gray-600">Awaiting auctioneer to select the next player...</p>
          </motion.div>
        )}

      </AnimatePresence>

      <footer className="absolute bottom-8 right-12 text-gray-700 font-mono text-sm uppercase tracking-widest">
        IPL Auction System — Live Broadcast
      </footer>
    </div>
  );
}
