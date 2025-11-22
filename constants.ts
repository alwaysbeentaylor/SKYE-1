import { User, UserRole, UserStatus, Family } from './types';

export const MOCK_PARENT_USER: User = {
  id: 'p1',
  name: 'Papa',
  role: UserRole.PARENT,
  avatar: '👨‍💼',
  colorFrom: '#1e40af', // Blue 800
  colorTo: '#3b82f6',   // Blue 500
  status: UserStatus.ONLINE,
};

export const MOCK_FAMILY: Family = {
  id: 'fam1',
  name: 'Family',
  members: [
    MOCK_PARENT_USER,
    {
      id: 'p2',
      name: 'Mama',
      role: UserRole.PARENT,
      avatar: '👩‍💼',
      colorFrom: '#7c3aed', // Violet
      colorTo: '#a855f7',   // Purple
      status: UserStatus.OFFLINE,
    },
    {
      id: 'c1',
      name: 'Lucas',
      role: UserRole.CHILD,
      avatar: '👦',
      colorFrom: '#059669', // Emerald
      colorTo: '#34d399',   // Green
      status: UserStatus.ONLINE,
      childCode: '123456',
      lastLocation: {
        latitude: 52.3676,
        longitude: 4.9041,
        address: "School",
        timestamp: Date.now()
      }
    },
    {
      id: 'c2',
      name: 'Emma',
      role: UserRole.CHILD,
      avatar: '👧',
      colorFrom: '#db2777', // Pink
      colorTo: '#f472b6',   // Rose
      status: UserStatus.BUSY,
      childCode: '654321',
      lastLocation: {
        latitude: 52.3676,
        longitude: 4.9041,
        address: "Playground",
        timestamp: Date.now()
      }
    },
  ],
};

export const GRADIENTS = {
  background: 'bg-gradient-to-b from-sky-300 via-blue-400 to-blue-600',
  glass: 'bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl',
  glassLight: 'bg-white/40 backdrop-blur-lg border border-white/50',
  bubbleParent: ['#1e3a8a', '#3b82f6'],
  bubbleChildBoy: ['#059669', '#34d399'],
  bubbleChildGirl: ['#be185d', '#f472b6'],
};
