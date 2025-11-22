import { User, UserRole, UserStatus, Family } from '../types';

// --- Mock Data ---

export const MOCK_USER_PARENT: User = {
  id: 'u1',
  name: 'Papa',
  role: UserRole.PARENT,
  avatar: '👨‍💼',
  colorFrom: '#6366f1',
  colorTo: '#a855f7',
  status: UserStatus.ONLINE,
  familyId: 'f1',
  email: 'parent@test.com'
};

export const MOCK_USER_CHILD: User = {
  id: 'c1',
  name: 'Sem',
  role: UserRole.CHILD,
  avatar: '🧒',
  colorFrom: '#3b82f6',
  colorTo: '#06b6d4',
  status: UserStatus.ONLINE,
  familyId: 'f1',
  childCode: '123456',
  lastLocation: {
      latitude: 52.3676,
      longitude: 4.9041,
      address: 'Thuis',
      timestamp: Date.now()
  }
};

export const MOCK_FAMILY: Family = {
  id: 'f1',
  name: 'De Vries',
  adminId: 'u1',
  memberIds: ['u1', 'c1']
};

export const MOCK_MEMBERS = [MOCK_USER_PARENT, MOCK_USER_CHILD];

// --- Mock Services ---

export const loginParent = async (email: string, pass: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  if (email === 'parent@test.com' && pass === 'password') {
    return MOCK_USER_PARENT;
  }
  throw new Error('Gebruik: parent@test.com / password');
};

export const loginChild = async (code: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (code === '123456') {
    return MOCK_USER_CHILD;
  }
  throw new Error('Gebruik code: 123456');
};

export const logoutUser = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
};

export const getFamilyMembers = async (familyId: string): Promise<User[]> => {
    return MOCK_MEMBERS;
};

// Mock subscription that just returns static data once
export const subscribeToFamily = (familyId: string, callback: (members: User[]) => void) => {
    setTimeout(() => callback(MOCK_MEMBERS), 100);
    return () => {};
};

export const createChildCode = async (code: string, uid: string, familyId: string) => {
  // Mock implementation - just return
  return Promise.resolve();
};

export const deleteChild = async (childId: string) => {
  // Mock implementation - just return
  return Promise.resolve();
};

export const createUser = async (user: User) => {
  // Mock implementation - just return
  return Promise.resolve();
};

