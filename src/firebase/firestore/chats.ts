'use client';

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Firestore,
  limit,
} from 'firebase/firestore';

export const getOrCreateChat = async (
  currentUserId: string,
  targetUserId: string,
  firestore: Firestore
): Promise<string> => {
  const chatsRef = collection(firestore, 'chats');

  // Query for an existing 1-on-1 chat
  const q = query(
    chatsRef,
    where('participants', 'in', [[currentUserId, targetUserId], [targetUserId, currentUserId]])
  );
  
  const querySnapshot = await getDocs(q);

  let existingChatId: string | null = null;
  querySnapshot.forEach(doc => {
      const data = doc.data();
      // Additional check to ensure it's a 1-on-1 chat
      if (data.participants.length === 2) {
          existingChatId = doc.id;
      }
  });

  if (existingChatId) {
    return existingChatId;
  } else {
    // Create a new chat
    const newChatRef = await addDoc(chatsRef, {
      participants: [currentUserId, targetUserId],
      updatedAt: serverTimestamp(),
      lastMessage: '',
      createdAt: serverTimestamp(),
      readBy: [],
    });
    return newChatRef.id;
  }
};
