import { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socket';

// WebRTC ICE Servers - STUN + TURN for better connectivity
const ICE_SERVERS = {
  iceServers: [
    // STUN servers (for NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN servers (for relay when direct connection fails)
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10 // Pre-gather more candidates
};

export const useWebRTC = (currentUserId: string, remoteUserId: string | null, isInitiator: boolean) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offerSentRef = useRef(false); // Prevent multiple offers
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false); // Track if initialization is in progress

  useEffect(() => {
    if (!remoteUserId) {
      // Cleanup if no remote user
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (peerConnection.current) {
        try {
          if (peerConnection.current.signalingState !== 'closed') {
            peerConnection.current.close();
          }
        } catch (e) {}
        peerConnection.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      return;
    }

    // Cleanup any existing closed connection
    if (peerConnection.current) {
      try {
        if (peerConnection.current.signalingState === 'closed') {
          peerConnection.current.close();
          peerConnection.current = null;
        } else {
          console.log('Reusing existing peer connection');
          return; // Don't reinitialize if connection is still valid
        }
      } catch (e) {
        peerConnection.current = null;
      }
    }
    
    // Reset flags for new connection
    offerSentRef.current = false;
    isInitializedRef.current = false;
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;
    console.log('Created new peer connection, isInitiator:', isInitiator);

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId) {
        console.log('ICE candidate:', event.candidate.type, event.candidate.protocol);
        socketService.emitIceCandidate({
          targetId: remoteUserId,
          candidate: event.candidate
        });
      } else if (!event.candidate) {
        console.log('ICE gathering complete');
      }
    };

    // Monitor ICE Connection State
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('ICE connection state:', state);
      
      if (state === 'failed' || state === 'disconnected') {
        console.warn('ICE connection failed, attempting ICE restart...');
        // Try to restart ICE
        if (pc.signalingState === 'stable') {
          pc.restartIce();
        }
      }
      
      if (state === 'connected' || state === 'completed') {
        console.log('ICE connection established successfully');
      }
    };

    // Monitor Connection State
    pc.onconnectionstatechange = () => {
      console.log('Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error('Peer connection failed');
      }
    };

    // Handle Remote Stream
    pc.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      console.log('Remote tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
      
      // Ensure we use the first stream
      const stream = event.streams[0];
      if (stream && stream.getTracks().length > 0) {
        setRemoteStream(stream);
      } else {
        console.warn('Remote stream has no tracks');
      }
    };

    // Get Local Stream with better error handling
    const initMedia = async () => {
      isInitializingRef.current = true;
      
      // Check if peer connection is still valid
      if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
        console.warn('PeerConnection closed before media init');
        isInitializingRef.current = false;
        return;
      }
      
      try {
        // Try to get media with video and audio
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: true 
        });
        
        // Double check connection is still valid
        if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
          console.warn('PeerConnection closed during media access');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        setLocalStream(stream);
        
        // Check connection is still valid before adding tracks
        if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
          console.warn('Connection closed, stopping tracks');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        stream.getTracks().forEach(track => {
          try {
            pc.addTrack(track, stream);
            console.log('Added track:', track.kind, track.enabled);
          } catch (err) {
            console.error('Error adding track:', err);
            track.stop();
          }
        });

        isInitializedRef.current = true;
        isInitializingRef.current = false;

        if (isInitiator && !offerSentRef.current) {
          // Initiator: Create Offer after a short delay
          setTimeout(() => {
            if (peerConnection.current && peerConnection.current.signalingState !== 'closed' && !offerSentRef.current) {
              createOffer();
            }
          }, 500);
        }
      } catch (err: any) {
        isInitializingRef.current = false;
        console.error('Error accessing media devices:', err);
        
        // Check connection still valid before fallback
        if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
          return;
        }
        
        // Fallback: Try audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          if (!peerConnection.current || peerConnection.current.signalingState === 'closed') {
            audioStream.getTracks().forEach(track => track.stop());
            return;
          }
          
          streamRef.current = audioStream;
          setLocalStream(audioStream);
          audioStream.getTracks().forEach(track => {
            try {
              if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
                pc.addTrack(track, audioStream);
              } else {
                track.stop();
              }
            } catch (err) {
              console.error('Error adding audio track:', err);
              track.stop();
            }
          });
          
          isInitializedRef.current = true;
          isInitializingRef.current = false;
          
          if (isInitiator && !offerSentRef.current && peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            setTimeout(() => createOffer(), 500);
          }
        } catch (audioErr) {
          console.error('Could not access audio either:', audioErr);
          isInitializingRef.current = false;
          // Continue without media - call can still work for signaling
          isInitializedRef.current = true;
          if (isInitiator && !offerSentRef.current && peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            setTimeout(() => createOffer(), 500);
          }
        }
      }
    };

    initMedia();

    // Socket Listeners for WebRTC Signaling (with cleanup)
    const handleCallAnswered = async ({ signal }: { signal: any }) => {
      console.log('Call answered, setting remote description');
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        } catch (err) {
          console.error('Error setting remote description:', err);
        }
      }
    };

    const handleIceCandidate = async ({ candidate }: { candidate: any }) => {
      if (peerConnection.current && candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    socketService.onCallAnswered(handleCallAnswered);
    socketService.onIceCandidate(handleIceCandidate);

    return () => {
      // Don't cleanup if we're still initializing
      if (isInitializingRef.current) {
        console.log('Skipping cleanup - initialization in progress');
        return;
      }
      
      // Cleanup listeners
      socketService.socket?.off('call:answered');
      socketService.socket?.off('call:candidate');
      
      // Cleanup media
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }
      
      // Cleanup peer connection
      if (peerConnection.current) {
        try {
          if (peerConnection.current.signalingState !== 'closed') {
            peerConnection.current.close();
          }
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
        peerConnection.current = null;
      }
      
      setLocalStream(null);
      setRemoteStream(null);
      isInitializedRef.current = false;
      offerSentRef.current = false;
    };
  }, [remoteUserId]); // Only depend on remoteUserId to prevent unnecessary re-runs

  // Helper to create offer
  const createOffer = async () => {
    if (!peerConnection.current || !remoteUserId) {
      console.warn('Cannot create offer: missing peerConnection or remoteUserId');
      return;
    }
    
    if (offerSentRef.current) {
      console.warn('Offer already sent, skipping');
      return;
    }
    
    try {
      console.log('Creating offer...');
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      offerSentRef.current = true;
      
      socketService.emitCallOffer({
        callerId: currentUserId,
        calleeId: remoteUserId,
        signal: offer
      });
      console.log('Offer sent to:', remoteUserId);
    } catch (err) {
      console.error('Error creating offer:', err);
      offerSentRef.current = false; // Reset on error
    }
  };

  // Helper to answer call
  const answerCall = async (offerSignal: any, targetRemoteUserId?: string) => {
    const targetId = targetRemoteUserId || remoteUserId;
    
    if (!targetId) {
      console.warn('Cannot answer call: missing remoteUserId');
      return;
    }
    
    // Wait for connection to be initialized and media to be ready
    let retries = 0;
    while ((!peerConnection.current || peerConnection.current.signalingState === 'closed' || !isInitializedRef.current) && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 150));
      retries++;
      if (retries % 5 === 0) {
        console.log(`Waiting for peerConnection (retry ${retries}/30)...`);
      }
    }
    
    if (!peerConnection.current) {
      console.error('Cannot answer call: peerConnection is null after wait');
      return;
    }
    
    if (peerConnection.current.signalingState === 'closed') {
      console.error('Cannot answer call: peerConnection is closed');
      return;
    }
    
    // Ensure we have local media tracks before answering
    if (!streamRef.current || streamRef.current.getTracks().length === 0) {
      console.warn('No local media tracks, waiting for media initialization...');
      // Wait a bit more for media
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      console.log('Answering call with signal, connection state:', peerConnection.current.signalingState);
      
      // Set remote description first
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offerSignal));
      console.log('Remote description set');
      
      // Create and set local answer
      const answer = await peerConnection.current.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.current.setLocalDescription(answer);
      console.log('Local description set');

      // Send answer
      socketService.emitCallAnswer({
        callerId: targetId,
        calleeId: currentUserId,
        signal: answer
      });
      console.log('Answer sent to:', targetId);
    } catch (err) {
      console.error('Error answering call:', err);
      throw err; // Re-throw so CallScreen can handle it
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  return { localStream, remoteStream, answerCall, cleanup };
};
