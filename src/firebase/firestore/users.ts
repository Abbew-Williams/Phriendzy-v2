'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

export const updateUserProfile = async (userId: string, data: any) => {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, data);
};
