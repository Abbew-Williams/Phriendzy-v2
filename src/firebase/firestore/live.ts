'use client';

import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import type { LiveStreamComment } from '@/lib/types';
import type { User } from 'firebase/auth';

export const createLiveStream = async (host: User, title: string) => {
    try {
        const liveStreamsCollection = collection(firestore, 'liveStreams');
        const docRef = await addDoc(liveStreamsCollection, {
            hostId: host.uid,
            title,
            status: 'active',
            viewerCount: 0,
            createdAt: serverTimestamp(),
        });
        return { success: true, streamId: docRef.id, error: null };
    } catch (error: any) {
        console.error("Error creating live stream: ", error);
        return { success: false, streamId: null, error: { message: error.message || "Failed to create live stream." } };
    }
};

export const endLiveStream = async (streamId: string) => {
     try {
        const streamRef = doc(firestore, 'liveStreams', streamId);
        await updateDoc(streamRef, {
            status: 'ended',
        });
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error ending live stream: ", error);
        return { success: false, error: { message: error.message || "Failed to end live stream." } };
    }
}

type LiveCommentData = Omit<LiveStreamComment, 'id' | 'createdAt'>;

export const addLiveComment = async (streamId: string, commentData: LiveCommentData) => {
    if (!commentData.text.trim()) throw new Error("Comment cannot be empty");

    const commentsColRef = collection(firestore, 'liveStreams', streamId, 'comments');

    try {
        const newCommentRef = await addDoc(commentsColRef, {
            ...commentData,
            createdAt: serverTimestamp(),
        });
        
        return { success: true, commentId: newCommentRef.id };
    } catch (error) {
        console.error("Error adding live comment:", error);
        return { success: false, error };
    }
};
