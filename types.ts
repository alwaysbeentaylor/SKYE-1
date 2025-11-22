export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
}

export interface User {
  id: string;
  uid?: string; // Firebase Auth ID
  name: string;
  role: UserRole;
  avatar?: string; // Emoji
  colorFrom: string;
  colorTo: string;
  status: UserStatus;
  childCode?: string; // 6-digit login code
  familyId: string;
  email?: string; // Only for parents
  fcmToken?: string; // For Push Notifications
  lastLocation?: LocationData;
}

export interface Family {
  id: string;
  name: string; // e.g. "Welkom familie"
  adminId: string; // Parent UID
  memberIds: string[];
}

export interface CallEvent {
  callerId: string;
  calleeId: string;
  signal?: any; // WebRTC signal data
  type: 'offer' | 'answer' | 'candidate' | 'end' | 'reject';
}

// Firestore Collection Structures (for reference)
/*
  users/
    {uid}: User
  
  families/
    {familyId}: Family

  childCodes/
    {code}: { uid: string, familyId: string }
*/
