import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { createUser, verifyChildCode, getUser } from "./db";
import { User, UserRole, UserStatus } from "../types";

export const registerParent = async (email: string, pass: string, name: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = cred.user;
  
  // Generate IDs
  const familyId = `fam_${fbUser.uid}`;
  
  const newUser: User = {
    id: fbUser.uid,
    uid: fbUser.uid,
    name,
    email,
    role: UserRole.PARENT,
    colorFrom: '#6366f1', // Indigo
    colorTo: '#a855f7',   // Purple
    status: UserStatus.ONLINE,
    familyId,
    avatar: '👑'
  };

  await createUser(newUser);
  // Note: We should also create the Family document here via db service
  return newUser;
};

export const loginParent = async (email: string, pass: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return await getUser(cred.user.uid);
};

export const loginChild = async (code: string) => {
  // 1. Sign in anonymously first (for Firestore security rules)
  try {
    await signInAnonymously(auth);
  } catch (err) {
    // If already signed in, sign out first
    if (auth.currentUser) {
      await signOut(auth);
      await signInAnonymously(auth);
    } else {
      throw err;
    }
  }
  
  // 2. Check Code in Firestore
  const data = await verifyChildCode(code);
  if (!data) {
    await signOut(auth);
    throw new Error("Ongeldige code");
  }
  
  // 3. Get User Data
  const user = await getUser(data.uid);
  if (!user) {
    await signOut(auth);
    throw new Error("Gebruiker niet gevonden");
  }
  
  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

// Auth Observer
export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

