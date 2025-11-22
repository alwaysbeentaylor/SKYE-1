import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus, Family } from './types';
import { GRADIENTS } from './constants';
// Use Firebase in production, mock in development (if env var not set)
const USE_MOCK = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === 'AIzaSyB-PLACEHOLDER';

// Debug: Log Firebase detection
console.log('🔍 Firebase Detection:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 20) + '...',
  fullApiKey: import.meta.env.VITE_FIREBASE_API_KEY, // Full key for debugging
  USE_MOCK,
  mode: USE_MOCK ? '🔴 MOCK MODE' : '🟢 FIREBASE MODE',
  allEnvVars: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
  }
});

import { loginParent as loginParentMock, loginChild as loginChildMock, logoutUser as logoutUserMock, getFamilyMembers as getFamilyMembersMock, createChildCode as createChildCodeMock, deleteChild as deleteChildMock, subscribeToFamily as subscribeToFamilyMock, createUser as createUserMock, MOCK_MEMBERS } from './services/mockServices';
import { loginParent, loginChild, logoutUser, subscribeToAuth, registerParent } from './services/auth';
import { getFamilyMembers, createChildCode, deleteChild, subscribeToFamily, createFamily, createUser, updateUserStatus } from './services/db';

import { socketService } from './services/socket';
import { requestNotificationPermission } from './firebaseConfig';

import BubbleCanvas from './components/BubbleCanvas';
import CallScreen from './components/CallScreen';
import { Plus, Settings, LogOut, Lock, Smartphone, ArrowRight, MapPin, Phone, X, Trash2, Edit2, Users } from 'lucide-react';

type ViewState = 'LOGIN_SELECT' | 'LOGIN_PARENT' | 'LOGIN_CHILD' | 'REGISTER_PARENT' | 'HOME' | 'CALL';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN_SELECT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [childCode, setChildCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Call State
  const [activeCallUser, setActiveCallUser] = useState<User | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState<any>(null);

  // Modals & Selections
  const [showAddChild, setShowAddChild] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedChild, setSelectedChild] = useState<User | null>(null);

  // --- Auth Observer (Firebase only) ---
  useEffect(() => {
    if (!USE_MOCK) {
      const unsubscribe = subscribeToAuth(async (firebaseUser) => {
        if (!firebaseUser) {
          setCurrentUser(null);
          setView('LOGIN_SELECT');
        }
      });
      return unsubscribe;
    }
  }, []);

  // --- Socket & Data Connection ---
  useEffect(() => {
    if (currentUser && currentUser.familyId) {
        // 1. Connect to Socket
        socketService.connect(currentUser.id, currentUser.familyId);

        // Update status to ONLINE in Firestore
        if (!USE_MOCK) {
          updateUserStatus(currentUser.id, UserStatus.ONLINE);
        }

        // Listen for realtime status updates from socket
        socketService.onFamilyUpdate((data) => {
          if (data.userId && data.status) {
             setMembers(prev => prev.map(m => 
               m.id === data.userId ? { ...m, status: data.status } : m
             ));
          }
        });

        // 2. Subscribe to Family Members
        const unsubFamily = USE_MOCK 
          ? subscribeToFamilyMock(currentUser.familyId, (updatedMembers) => {
              setMembers(updatedMembers);
              const me = updatedMembers.find(m => m.id === currentUser.id);
              if (me) setCurrentUser(me);
            })
          : subscribeToFamily(currentUser.familyId, (updatedMembers) => {
              setMembers(updatedMembers);
              const me = updatedMembers.find(m => m.id === currentUser.id);
              if (me) setCurrentUser(me);
            });

        // 3. Listen for Incoming Calls
        const handleIncomingCall = ({ callerId, signal }: { callerId: string, signal: any }) => {
            console.log('Incoming call from:', callerId);
            if (view !== 'CALL' && !isIncomingCall) {
                // Use current members state, or fetch fresh
                setMembers(currentMembers => {
                    const caller = currentMembers.find(m => m.id === callerId);
                    if (caller) {
                        console.log('Setting incoming call for:', caller.name);
                        setActiveCallUser(caller);
                        setIncomingSignal(signal);
                        setIsIncomingCall(true);
                        
                        if (Notification.permission === 'granted') {
                            new Notification(`${caller.name} belt je!`, { body: 'Tik om op te nemen' });
                        }
                    } else {
                        console.warn('Caller not found in members:', callerId, 'Available:', currentMembers.map(m => m.id));
                        // Try to fetch fresh from DB if not in current state
                        if (!USE_MOCK) {
                          getFamilyMembers(currentUser.familyId).then(freshMembers => {
                            const freshCaller = freshMembers.find(m => m.id === callerId);
                            if (freshCaller) {
                              console.log('Found caller in fresh data:', freshCaller.name);
                              setActiveCallUser(freshCaller);
                              setIncomingSignal(signal);
                              setIsIncomingCall(true);
                            }
                          });
                        } else {
                          // Fallback to mock data in development
                          const freshCaller = MOCK_MEMBERS.find(m => m.id === callerId);
                          if (freshCaller) {
                            console.log('Found caller in mock data:', freshCaller.name);
                            setActiveCallUser(freshCaller);
                            setIncomingSignal(signal);
                            setIsIncomingCall(true);
                          }
                        }
                    }
                    return currentMembers;
                });
            }
        };
        
        socketService.onIncomingCall(handleIncomingCall);

        // 4. Request Notification Permission (FCM)
        if (!USE_MOCK) {
          requestNotificationPermission(currentUser.id);
        }

        return () => {
            if (!USE_MOCK && currentUser) {
              updateUserStatus(currentUser.id, UserStatus.OFFLINE);
            }
            socketService.disconnect();
            unsubFamily();
        };
    }
  }, [currentUser?.id, currentUser?.familyId]);

  // --- Handlers ---

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = USE_MOCK 
        ? await loginParentMock(email, password)
        : await loginParent(email, password);
      
      if (!user) {
          throw new Error("Inloggen mislukt");
      }
      setCurrentUser(user);
      setView('HOME');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ongeldige gegevens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (USE_MOCK) {
        throw new Error("Registratie werkt alleen met Firebase. Configureer je .env bestand.");
      }
      const user = await registerParent(email, password, name);
      setCurrentUser(user);
      setView('HOME');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registratie mislukt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = USE_MOCK
        ? await loginChildMock(childCode)
        : await loginChild(childCode);
      setCurrentUser(user);
      setView('HOME');
    } catch (err: any) {
      setError(err.message || 'Ongeldige code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberClick = (member: User) => {
    if (currentUser?.role === UserRole.CHILD) {
      setActiveCallUser(member);
      setIsIncomingCall(false);
      setIncomingSignal(null);
      setView('CALL');
    } else {
      setSelectedChild(member);
    }
  };

  const handleAddChild = async () => {
    if (!currentUser) return;
    const name = prompt("Naam kind:");
    if (!name) return;

    const newId = `child_${Date.now()}`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newChild: User = {
      id: newId,
      uid: newId, // For children, uid = id (no Firebase Auth)
      name,
      role: UserRole.CHILD,
      avatar: '👶',
      colorFrom: '#059669',
      colorTo: '#34d399',
      status: UserStatus.OFFLINE,
      childCode: code,
      familyId: currentUser.familyId,
      lastLocation: {
          latitude: 52.3676,
          longitude: 4.9041,
          address: 'Thuis',
          timestamp: Date.now()
      }
    };

    try {
        if (USE_MOCK) {
          await createUserMock(newChild);
          await createChildCodeMock(code, newId, currentUser.familyId);
        } else {
          await createUser(newChild);
          await createChildCode(code, newId, currentUser.familyId);
        }
        alert(`Nieuwe kind code: ${code}`);
        setShowAddChild(false);
    } catch (err: any) {
        console.error('Error creating child:', err);
        alert(`Fout bij aanmaken kind: ${err.message || 'Onbekende fout'}`);
    }
  };

  const handleDeleteChild = async (member: User) => {
    if (window.confirm(`${member.name} verwijderen uit familie?`)) {
      try {
          if (USE_MOCK) {
            await deleteChildMock(member.id);
          } else {
            await deleteChild(member.id);
          }
      } catch(err) {
          alert("Fout bij verwijderen");
      }
    }
  };

  const handleLogout = async () => {
    if (USE_MOCK) {
      await logoutUserMock();
    } else {
      await logoutUser();
    }
    socketService.disconnect();
    setCurrentUser(null);
    setView('LOGIN_SELECT');
    setEmail('');
    setPassword('');
    setChildCode('');
  };

  // --- RENDER VIEWS ---

  // CALL SCREEN
  if (view === 'CALL' || isIncomingCall) {
    return (
      <CallScreen 
        currentUser={currentUser!}
        remoteUser={activeCallUser}
        isIncoming={isIncomingCall}
        incomingSignal={incomingSignal}
        onHangup={() => {
          setView('HOME');
          setIsIncomingCall(false);
          setActiveCallUser(null);
          setIncomingSignal(null);
        }}
        onAnswer={() => {
          setIsIncomingCall(false);
          setView('CALL');
        }}
      />
    );
  }

  // HOME SCREEN
  if (view === 'HOME' && currentUser) {
    return (
      <div className={`relative w-full h-full ${GRADIENTS.background} overflow-hidden`}>
        <BubbleCanvas 
          members={members}
          currentUser={currentUser}
          onMemberClick={handleMemberClick}
          onDeleteDrop={handleDeleteChild}
        />

        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 flex gap-3 z-30">
          {currentUser.role === UserRole.PARENT && (
            <>
              <button 
                onClick={handleAddChild}
                className={`${GRADIENTS.glassLight} p-3 rounded-full text-white shadow-lg active:scale-95 transition-all`}
              >
                <Plus size={24} />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className={`${GRADIENTS.glassLight} p-3 rounded-full text-white shadow-lg active:scale-95 transition-all`}
              >
                <Settings size={24} />
              </button>
            </>
          )}
          <button 
            onClick={handleLogout}
            className="bg-red-500/20 backdrop-blur-md border border-red-500/30 p-3 rounded-full text-white shadow-lg active:scale-95 transition-all"
          >
            <LogOut size={24} />
          </button>
        </div>

        {/* SETTINGS MODAL */}
        {showSettings && currentUser.role === UserRole.PARENT && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4" onClick={() => setShowSettings(false)}>
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-center relative">
                <h2 className="text-2xl font-black text-white drop-shadow-sm">Instellingen</h2>
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 bg-black/10 p-1 rounded-full text-white hover:bg-black/20">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={16} /> Familie Leden
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{member.avatar}</div>
                          <div>
                            <p className="font-bold text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.role === UserRole.PARENT ? 'Ouder' : 'Kind'}</p>
                          </div>
                        </div>
                        {member.role === UserRole.CHILD && (
                          <button
                            onClick={() => {
                              setShowSettings(false);
                              handleDeleteChild(member);
                            }}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      if (window.confirm('Weet je zeker dat je alle kinderen wilt verwijderen?')) {
                        members
                          .filter(m => m.role === UserRole.CHILD)
                          .forEach(child => handleDeleteChild(child));
                        setShowSettings(false);
                      }
                    }}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Verwijder alle kinderen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PARENT VIEW: Child Detail Modal */}
        {selectedChild && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in p-4" onClick={() => setSelectedChild(null)}>
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl transform transition-all animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
                
                <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-6 text-center relative">
                    <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center text-4xl shadow-lg border-4 border-white/50 mb-2">
                        {selectedChild.avatar}
                    </div>
                    <h2 className="text-2xl font-black text-white drop-shadow-sm">{selectedChild.name}</h2>
                    <div className="flex justify-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedChild.status === 'ONLINE' ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-700'}`}>
                            {selectedChild.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <button onClick={() => setSelectedChild(null)} className="absolute top-4 right-4 bg-black/10 p-1 rounded-full text-white hover:bg-black/20">
                        <Plus className="rotate-45" size={20} />
                    </button>
                </div>

                <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} /> Laatste Locatie
                        </h3>
                        <span className="text-xs text-sky-600 font-semibold">
                            {selectedChild.lastLocation?.timestamp 
                                ? new Date(selectedChild.lastLocation.timestamp).toLocaleTimeString('nl-NL') 
                                : 'Onbekend'}
                        </span>
                    </div>
                    
                    <div className="w-full h-40 bg-sky-100 rounded-xl border-2 border-sky-200 relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                        
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute"></div>
                            <div className="w-8 h-8 bg-white rounded-full border-2 border-blue-500 flex items-center justify-center shadow-md z-10">
                                {selectedChild.avatar}
                            </div>
                            <div className="w-0.5 h-3 bg-blue-500"></div>
                            <div className="w-2 h-1 bg-black/20 rounded-full"></div>
                        </div>

                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-gray-600 shadow-sm border border-white">
                            {selectedChild.lastLocation?.address || "Lat: " + selectedChild.lastLocation?.latitude.toFixed(4)}
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <button 
                        onClick={() => {
                            setSelectedChild(null);
                            setActiveCallUser(selectedChild);
                            setIsIncomingCall(false);
                            setIncomingSignal(null);
                            setView('CALL');
                        }}
                        className="w-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 transform active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
                    >
                        <Phone className="fill-current" /> Nu Bellen
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOGIN SCREENS
  return (
    <div className={`w-full h-full ${GRADIENTS.background} flex items-center justify-center p-6 relative`}>
      <div className="absolute w-96 h-96 bg-sky-200 rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob top-0 left-0"></div>
      <div className="absolute w-96 h-96 bg-blue-200 rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob bottom-0 right-0 animation-delay-2000"></div>

      <div className={`w-full max-w-md ${GRADIENTS.glass} rounded-3xl p-8 flex flex-col items-center shadow-2xl transition-all border-t border-l border-white/50 relative z-10`}>
        <h1 className="text-5xl font-black text-white mb-1 tracking-tighter italic drop-shadow-sm">SKYE</h1>
        <p className="text-sky-50 font-medium mb-8 tracking-wide text-sm opacity-90">Familie Verbinding</p>

        {view === 'LOGIN_SELECT' && (
          <div className="w-full flex flex-col gap-4">
            <button 
              onClick={() => setView('LOGIN_PARENT')}
              className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl p-6 flex items-center justify-between group transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-full shadow-md">
                   <Settings size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-white">Ik ben een Ouder</h3>
                  <p className="text-sm text-white/80">Beheer familie & instellingen</p>
                </div>
              </div>
              <ArrowRight className="opacity-70 group-hover:translate-x-1 transition-transform text-white" />
            </button>

            <button 
              onClick={() => setView('LOGIN_CHILD')}
              className="w-full bg-white/20 hover:bg-white/30 border border-white/30 rounded-2xl p-6 flex items-center justify-between group transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-400 rounded-full shadow-md">
                   <Smartphone size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-white">Ik ben een Kind</h3>
                  <p className="text-sm text-white/80">Voer je magische code in</p>
                </div>
              </div>
              <ArrowRight className="opacity-70 group-hover:translate-x-1 transition-transform text-white" />
            </button>
          </div>
        )}

        {view === 'LOGIN_PARENT' && (
          <form onSubmit={handleParentLogin} className="w-full flex flex-col gap-4">
            {USE_MOCK && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-2 text-sm w-full rounded-lg">
                <p className="font-bold">Demo Modus</p>
                <p>Email: parent@test.com</p>
                <p>Wachtwoord: password</p>
              </div>
            )}
            <div className="space-y-4 w-full">
              <div>
                <label className="text-sm text-white/80 ml-2 font-bold">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all backdrop-blur-sm"
                  placeholder="ouder@familie.nl"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/80 ml-2 font-bold">Wachtwoord</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-100 text-sm text-center bg-red-500/40 p-2 rounded-lg border border-red-500/50">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all mt-4"
            >
              {isLoading ? 'Inloggen...' : 'Inloggen'}
            </button>
            {!USE_MOCK && (
              <button 
                type="button" 
                onClick={() => {
                  setView('REGISTER_PARENT');
                  setError('');
                }} 
                className="text-white/70 text-sm hover:text-white mt-2 font-medium"
              >
                Nog geen account? Registreer hier
              </button>
            )}
            <button type="button" onClick={() => setView('LOGIN_SELECT')} className="text-white/70 text-sm hover:text-white mt-1 font-medium">Terug</button>
          </form>
        )}

        {view === 'REGISTER_PARENT' && (
          <form onSubmit={handleParentRegister} className="w-full flex flex-col gap-4">
            <div className="space-y-4 w-full">
              <div>
                <label className="text-sm text-white/80 ml-2 font-bold">Naam</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all backdrop-blur-sm"
                  placeholder="Mama / Papa"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/80 ml-2 font-bold">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all backdrop-blur-sm"
                  placeholder="ouder@familie.nl"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-white/80 ml-2 font-bold">Wachtwoord</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all backdrop-blur-sm"
                  placeholder="Minimaal 6 tekens"
                  required
                  minLength={6}
                />
              </div>
            </div>
            {error && <p className="text-red-100 text-sm text-center bg-red-500/40 p-2 rounded-lg border border-red-500/50">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all mt-4"
            >
              {isLoading ? 'Account aanmaken...' : 'Account aanmaken'}
            </button>
            <button type="button" onClick={() => {
              setView('LOGIN_PARENT');
              setError('');
            }} className="text-white/70 text-sm hover:text-white mt-2 font-medium">Al een account? Log in</button>
            <button type="button" onClick={() => setView('LOGIN_SELECT')} className="text-white/70 text-sm hover:text-white mt-1 font-medium">Terug</button>
          </form>
        )}

        {view === 'LOGIN_CHILD' && (
          <form onSubmit={handleChildLogin} className="w-full flex flex-col gap-6 items-center">
             <div className="bg-white/10 p-4 rounded-full mb-2 border border-white/20 shadow-inner">
               <Lock size={48} className="text-sky-200" />
             </div>
             {USE_MOCK && (
               <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-2 text-sm w-full rounded-lg">
                 <p className="font-bold">Demo Modus</p>
                 <p>Code: 123456</p>
               </div>
             )}
             <div className="w-full">
               <label className="text-sm text-center block mb-4 text-white/90 font-bold">Voer je 6-cijferige Magische Code in</label>
               <input 
                 type="text" 
                 inputMode="numeric"
                 maxLength={6}
                 value={childCode} 
                 onChange={e => setChildCode(e.target.value.replace(/\D/g, ''))}
                 className="w-full bg-black/10 border-2 border-white/20 rounded-2xl p-6 text-center text-4xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-sky-400 focus:bg-black/20 transition-all placeholder-white/20"
                 placeholder="000000"
                 autoFocus
               />
             </div>
             {error && <p className="text-red-100 text-sm text-center bg-red-500/40 p-2 rounded-lg w-full border border-red-500/50">{error}</p>}
             <button 
               type="submit" 
               disabled={isLoading || childCode.length < 6}
               className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isLoading ? 'Code controleren...' : 'SKYE openen'}
             </button>
             <button type="button" onClick={() => setView('LOGIN_SELECT')} className="text-white/70 text-sm hover:text-white font-medium">Terug</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default App;
