'use client';

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';

export const createStatus = async (statusData: {
    authorId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
}) => {
    try {
        const statusesCollection = collection(firestore, 'users', statusData.authorId, 'statuses');
        const now = Timestamp.now();
        const expiresAt = new Timestamp(now.seconds + 24 * 60 * 60, now.nanoseconds);

        await addDoc(statusesCollection, {
            ...statusData,
            createdAt: now,
            expiresAt: expiresAt,
        });
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error creating status: ", error);
        return { success: false, error: { message: error.message || "Failed to post status." } };
    }
};
