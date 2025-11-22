import { io, Socket } from 'socket.io-client';
import { CallEvent, LocationData } from '../types';

// Use environment variable or fallback to localhost
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  public socket: Socket | null = null;

  connect(userId: string, familyId: string) {
    this.socket = io(SERVER_URL, {
      auth: { userId, familyId },
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket Server:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket Connection Error:', err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // --- Call Signaling ---

  emitCallOffer(data: { callerId: string, calleeId: string, signal: any }) {
    this.socket?.emit('call:offer', data);
  }

  emitCallAnswer(data: { callerId: string, calleeId: string, signal: any }) {
    this.socket?.emit('call:answer', data);
  }

  emitIceCandidate(data: { targetId: string, candidate: any }) {
    this.socket?.emit('call:candidate', data);
  }

  emitEndCall(data: { targetId: string }) {
    this.socket?.emit('call:end', data);
  }

  // --- Location ---

  emitLocationUpdate(location: LocationData) {
    this.socket?.emit('location:update', location);
  }

  // --- Listeners ---

  onIncomingCall(callback: (data: { callerId: string, signal: any }) => void) {
    this.socket?.off('call:incoming'); // Remove old listener first
    this.socket?.on('call:incoming', callback);
  }

  onCallAnswered(callback: (data: { signal: any }) => void) {
    this.socket?.off('call:answered');
    this.socket?.on('call:answered', callback);
  }

  onIceCandidate(callback: (data: { candidate: any }) => void) {
    this.socket?.off('call:candidate');
    this.socket?.on('call:candidate', callback);
  }

  onCallEnded(callback: () => void) {
    this.socket?.off('call:ended');
    this.socket?.on('call:ended', callback);
  }

  onLocationUpdate(callback: (data: { userId: string, location: LocationData }) => void) {
    this.socket?.off('location:update');
    this.socket?.on('location:update', callback);
  }

  onFamilyUpdate(callback: (data: any) => void) {
      this.socket?.off('family:update');
      this.socket?.on('family:update', callback);
  }
}

export const socketService = new SocketService();

