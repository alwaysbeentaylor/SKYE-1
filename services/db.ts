import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query, 
    where, 
    onSnapshot, 
    deleteDoc 
  } from "firebase/firestore";
  import { db } from "../firebaseConfig";
  import { User, Family, UserRole, UserStatus } from "../types";
  
  // --- USER OPERATIONS ---
  
  export const createUser = async (user: User) => {
    await setDoc(doc(db, "users", user.id), user);
    // Also update family member list if needed, but usually we just query by familyId
  };
  
  export const getUser = async (userId: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data() as User) : null;
  };
  
  export const updateUserStatus = async (userId: string, status: UserStatus) => {
    await updateDoc(doc(db, "users", userId), { status });
  };
  
  export const updateUserLocation = async (userId: string, location: any) => {
      await updateDoc(doc(db, "users", userId), { lastLocation: location });
  }
  
  // --- FAMILY OPERATIONS ---
  
  export const createFamily = async (adminId: string, familyName: string): Promise<Family> => {
    const familyId = `fam_${Date.now()}`;
    const family: Family = {
      id: familyId,
      name: familyName,
      adminId,
      memberIds: [adminId]
    };
    await setDoc(doc(db, "families", familyId), family);
    return family;
  };
  
  export const getFamilyMembers = async (familyId: string): Promise<User[]> => {
    const q = query(collection(db, "users"), where("familyId", "==", familyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  };
  
  export const subscribeToFamily = (familyId: string, callback: (members: User[]) => void) => {
    const q = query(collection(db, "users"), where("familyId", "==", familyId));
    return onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => doc.data() as User);
      callback(members);
    });
  };
  
  // --- CHILD CODES ---
  
  export const createChildCode = async (code: string, uid: string, familyId: string) => {
      await setDoc(doc(db, "childCodes", code), { uid, familyId });
  };
  
  export const verifyChildCode = async (code: string): Promise<{ uid: string, familyId: string } | null> => {
      const snap = await getDoc(doc(db, "childCodes", code));
      return snap.exists() ? (snap.data() as { uid: string, familyId: string }) : null;
  };
  
  export const deleteChild = async (childId: string) => {
      await deleteDoc(doc(db, "users", childId));
      // Optionally cleanup childCodes
  };

