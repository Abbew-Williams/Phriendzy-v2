'use client';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase';

export const createPost = async (postData: {
    authorId: string;
    caption: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
}) => {
    try {
        const postsCollection = collection(firestore, 'posts');
        await addDoc(postsCollection, {
            ...postData,
            likesCount: 0,
            commentsCount: 0,
            createdAt: serverTimestamp(),
        });
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error creating post: ", error);
        return { success: false, error };
    }
};
