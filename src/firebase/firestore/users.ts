'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';

export const updateUserProfile = async (userId: string, data: any) => {
    try {
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, data);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return { success: false, error };
    }
};
