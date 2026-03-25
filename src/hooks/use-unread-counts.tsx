'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function useUnreadCounts() {
  const { appUser } = useUser();
  const firestore = useFirestore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  // Unread notifications
  useEffect(() => {
    if (!firestore || !appUser?.uid) {
        setNotificationCount(0);
        return;
    }

    const q = query(
      collection(firestore, 'users', appUser.uid, 'notifications'),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.size);
    }, (error) => {
        console.error("Error fetching unread notifications:", error);
        setNotificationCount(0);
    });

    return () => unsubscribe();
  }, [firestore, appUser]);

  // Unread messages
  useEffect(() => {
    if (!firestore || !appUser?.uid) {
        setMessageCount(0);
        return;
    }

    const q = query(
      collection(firestore, 'chats'),
      where('participants', 'array-contains', appUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadChats = snapshot.docs.filter(doc => {
        const data = doc.data();
        // A chat is unread if there's a last message from someone else AND the current user is not in the readBy array.
        return data.lastMessageAuthorId && data.lastMessageAuthorId !== appUser.uid && !data.readBy?.includes(appUser.uid);
      });
      setMessageCount(unreadChats.length);
    }, (error) => {
        console.error("Error fetching unread messages:", error);
        setMessageCount(0);
    });

    return () => unsubscribe();
  }, [firestore, appUser]);

  return { notificationCount, messageCount };
}
