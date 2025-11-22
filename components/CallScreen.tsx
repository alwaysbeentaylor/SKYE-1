import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, MapPin, User as UserIcon, Navigation } from 'lucide-react';
import { User, LocationData } from '../types';
import { useWebRTC } from '../hooks/useWebRTC';
import { socketService } from '../services/socket';

interface CallScreenProps {
  currentUser: User;
  remoteUser: User | null;
  isIncoming: boolean;
  incomingSignal?: any;
  onHangup: () => void;
  onAnswer: () => void;
}

const CallScreen: React.FC<CallScreenProps> = ({ currentUser, remoteUser, isIncoming, incomingSignal, onHangup, onAnswer }) => {
  const [status, setStatus] = useState(isIncoming ? 'Gaat over...' : 'Bellen...');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  const [remoteLocation, setRemoteLocation] = useState<LocationData | null>(null);
  const [duration, setDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [callStarted, setCallStarted] = useState(!isIncoming); // Start immediately for outgoing calls

  // Bepaal éénmalig of deze gebruiker de beller (initiator) is
  const initiatorRef = useRef(!isIncoming);

  // WebRTC Logic - voor incoming calls: initialiseer direct zodat het klaar is bij answer
  // Voor outgoing calls: wacht tot callStarted
  const shouldInitWebRTC = (isIncoming && remoteUser !== null) || (callStarted && remoteUser !== null);
  const { localStream, remoteStream, answerCall, cleanup } = useWebRTC(
    currentUser.id,
    shouldInitWebRTC ? (remoteUser?.id || null) : null,
    initiatorRef.current
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Video Streams Binding
  useEffect(() => {
    if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        setIsConnected(true);
        setStatus('Verbonden');
    }
  }, [remoteStream]);

  // Call Duration Timer
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // GPS Tracking Logic
  useEffect(() => {
    if (!isConnected || !remoteUser) return;

    // 1. Listen for Remote Location Updates
    socketService.onLocationUpdate(({ userId, location }) => {
        if (userId === remoteUser.id) {
            setRemoteLocation(location);
        }
    });

    // 2. Send My Location periodically
    const sendLocationInterval = setInterval(() => {
      if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
              const myLoc: LocationData = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  timestamp: Date.now(),
                  // In a real app, perform reverse geocoding here
                  address: `Lat: ${pos.coords.latitude.toFixed(4)}` 
              };
              socketService.emitLocationUpdate(myLoc);
          }, (err) => console.warn("GPS Error:", err));
      }
    }, 10000); // Every 10s

    return () => {
      clearInterval(sendLocationInterval);
    };
  }, [isConnected, remoteUser]);

  // Listen for End Call
  useEffect(() => {
      const handleEnd = () => {
          console.log('Call ended received');
          handleHangup();
      };
      socketService.onCallEnded(handleEnd);
      
      return () => {
          socketService.socket?.off('call:ended');
      };
  }, []);

  const handleAnswer = async () => {
    onAnswer();
    setStatus('Verbinden...');
    setCallStarted(true);
    
    // For incoming calls, WebRTC is already initialized, just need to answer
    if (incomingSignal && remoteUser) {
      console.log('Answering call with signal:', incomingSignal);
      
      // Wait a bit for WebRTC to be fully ready (media tracks initialized)
      let retries = 0;
      while (retries < 20) {
        if (localStream && localStream.getTracks().length > 0) {
          break; // Media is ready
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      try {
        await answerCall(incomingSignal, remoteUser.id);
        console.log('Call answered successfully');
      } catch (e) {
        console.error("Answer call failed:", e);
        setStatus('Fout bij verbinden');
      }
    } else {
      console.warn('No incoming signal or remoteUser to answer');
    }
  };

  const handleHangup = () => {
      console.log('Hanging up call');
      if (remoteUser) {
          socketService.emitEndCall({ targetId: remoteUser.id });
      }
      cleanup();
      setCallStarted(false);
      setIsConnected(false);
      onHangup();
  };

  const toggleMute = () => {
      if (localStream) {
          localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMuted(!isMuted);
      }
  };

  const toggleVideo = () => {
      if (localStream) {
          localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
          setIsVideoOff(!isVideoOff);
      }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 3D Button Styles (SKYE Theme)
  const btnBase = "group relative flex items-center justify-center transition-all duration-100 active:translate-y-[4px] active:shadow-none select-none";
  const btnRound = "rounded-full w-16 h-16 md:w-20 md:h-20";
  const btnGlass = "bg-sky-500/30 backdrop-blur-md border-2 border-white/40 shadow-[0_6px_0_rgba(0,0,0,0.1)] hover:bg-sky-500/40 text-white";
  const btnGreen = "bg-gradient-to-b from-green-400 to-green-600 border-b-4 border-green-800 shadow-[0_6px_0_#166534] text-white";
  const btnRed = "bg-gradient-to-b from-red-400 to-red-600 border-b-4 border-red-800 shadow-[0_6px_0_#991b1b] text-white";
  
  if (isIncoming && !isConnected) {
    return (
      <div className="fixed inset-0 z-50 bg-sky-900 flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-sky-950 opacity-80"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="z-10 flex flex-col items-center w-full max-w-sm">
          {/* 3D Avatar Bubble */}
          <div className="relative mb-12 group">
            <div className="absolute inset-0 bg-white/40 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-700"></div>
            <div className="w-44 h-44 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 p-1 shadow-[0_10px_25px_rgba(0,0,0,0.3)] border-[6px] border-white/30 relative overflow-hidden flex items-center justify-center text-8xl animate-bounce-slow">
               <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent"></div>
               {remoteUser?.avatar || <UserIcon size={64} className="text-white" />}
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-xl border border-white/40 px-6 py-2 rounded-full whitespace-nowrap shadow-lg">
              <span className="text-white font-black text-xl tracking-wide drop-shadow-md">{remoteUser?.name}</span>
            </div>
          </div>

          <p className="text-sky-200 font-bold tracking-widest uppercase text-sm mb-16 animate-pulse bg-sky-900/50 px-4 py-1 rounded-full">Inkomende oproep...</p>

          <div className="flex gap-8 items-center w-full justify-center">
            <button onClick={handleHangup} className={`${btnBase} ${btnRed} ${btnRound}`}>
              <PhoneOff size={32} fill="currentColor" />
            </button>
            
            <button onClick={handleAnswer} className={`${btnBase} ${btnGreen} ${btnRound} w-24 h-24 md:w-28 md:h-28 -mt-4`}>
               <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping opacity-50"></div>
               <Phone size={40} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-hidden font-sans">
      {/* Remote Video */}
      <div className="absolute inset-0 bg-slate-800">
        <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
        />
        {/* Placeholder if no video yet */}
        {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
                 <img 
                    src={`https://picsum.photos/800/1200?random=${remoteUser?.id}`} 
                    alt="Remote Placeholder" 
                    className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full"></div>
                </div>
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50"></div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-10 flex justify-between items-start z-20">
         <div className="flex flex-col">
            <h3 className="text-2xl font-black text-white drop-shadow-md">{remoteUser?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse shadow-[0_0_10px_#4ade80]`}></div>
               <span className="text-white font-bold text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                 {isConnected ? formatTime(duration) : status}
               </span>
            </div>
         </div>
         
         {/* Mini Map Toggle */}
         <button 
           onClick={() => setShowMap(!showMap)}
           className={`${btnBase} w-12 h-12 rounded-xl ${showMap ? 'bg-sky-500 border-b-4 border-sky-700' : 'bg-white/20 border-2 border-white/40'} shadow-lg text-white backdrop-blur-md`}
         >
           <MapPin size={20} className={showMap ? 'animate-bounce' : ''} />
         </button>
      </div>

      {/* PiP (Local Video) */}
      <div className="absolute top-28 right-4 w-28 h-40 md:w-32 md:h-48 bg-gray-800 rounded-2xl overflow-hidden border-[3px] border-white/40 shadow-2xl z-20 transform transition-all hover:scale-105 hover:border-white">
        <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>

      {/* Map Modal Overlay */}
      {showMap && (
        <div className="absolute bottom-36 left-4 right-4 z-30 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80">
            {/* Map Header */}
            <div className="bg-sky-500 p-3 flex items-center justify-between text-white shadow-sm relative z-10">
               <div className="flex items-center gap-2 font-bold">
                 <Navigation size={16} className="fill-white/20" />
                 <span>Live Locatie</span>
               </div>
               <span className="text-[10px] uppercase font-bold bg-sky-600 px-2 py-1 rounded text-sky-100 tracking-wide">Volgen</span>
            </div>
            
            {/* Map Body */}
            <div className="h-48 bg-sky-50 relative overflow-hidden group cursor-pointer">
               {/* Grid pattern */}
               <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#0ea5e9 2px, transparent 2px)', backgroundSize: '20px 20px'}}></div>
               
               {/* Streets (Fake) */}
               <div className="absolute top-0 left-1/2 w-6 h-full bg-white -rotate-12 transform border-x-2 border-sky-100"></div>
               <div className="absolute top-1/2 left-0 w-full h-6 bg-white rotate-3 transform border-y-2 border-sky-100"></div>

               {remoteLocation ? (
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500">
                    <div className="relative animate-bounce">
                      <div className="w-14 h-14 bg-white rounded-full p-1 shadow-xl border-2 border-sky-500 z-10 relative">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-2xl">
                           {remoteUser?.avatar}
                        </div>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-sky-500 mt-1"></div>
                    </div>
                 </div>
               ) : (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full"></div>
                    <p className="absolute mt-16 text-xs text-sky-600 font-bold">Locatie bepalen...</p>
                 </div>
               )}
            </div>

            {/* Address Footer */}
            <div className="bg-white p-4 border-t border-gray-100">
               <div className="flex items-start gap-3">
                 <div className="bg-sky-100 p-2.5 rounded-full text-sky-600">
                    <MapPin size={20} />
                 </div>
                 <div>
                   <p className="font-bold text-gray-800 text-sm leading-tight">
                     {remoteLocation?.address || "Wachten op GPS..."}
                   </p>
                   <p className="text-xs text-gray-400 mt-1 font-mono">
                     {remoteLocation ? new Date(remoteLocation.timestamp).toLocaleTimeString('nl-NL') : ''}
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex justify-center items-end gap-5 md:gap-8 z-40 bg-gradient-to-t from-black/60 to-transparent">
        
        <button 
          onClick={toggleVideo}
          className={`${btnBase} ${btnRound} ${isVideoOff ? 'bg-gray-200 border-b-4 border-gray-400 text-gray-600' : btnGlass} w-14 h-14 md:w-16 md:h-16`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} className="text-white" />}
        </button>

        <button 
          onClick={handleHangup}
          className={`${btnBase} ${btnRed} rounded-2xl w-20 h-16 md:w-24 md:h-20 flex-col gap-1 !border-b-[6px] active:!border-b-0 active:!translate-y-[6px]`}
        >
          <PhoneOff size={28} className="mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Ophangen</span>
        </button>

        <button 
          onClick={toggleMute}
          className={`${btnBase} ${btnRound} ${isMuted ? 'bg-white border-b-4 border-gray-300 text-gray-900' : btnGlass} w-14 h-14 md:w-16 md:h-16`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} className="text-white" />}
        </button>
        
      </div>
    </div>
  );
};

export default CallScreen;
