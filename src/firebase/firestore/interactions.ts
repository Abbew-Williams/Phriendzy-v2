'use client';

import {
  doc,
  writeBatch,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  increment,
  collection,
  Firestore,
} from 'firebase/firestore';
import { firestore as defaultFirestore } from '@/firebase';

// Helper to create notifications
const createNotification = async (firestore: Firestore, data: {
  type: 'like' | 'comment' | 'follow';
  fromUserId: string;
  toUserId: string;
  postId?: string;
  commentId?: string;
  commentText?: string;
}) => {
  if (data.fromUserId === data.toUserId) return; // Don't notify on self-actions
  try {
    const notificationsColRef = collection(firestore, 'users', data.toUserId, 'notifications');
    const notificationData: any = {
      type: data.type,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      read: false,
      createdAt: serverTimestamp(),
    };
    if (data.postId) notificationData.postId = data.postId;
    if (data.commentId) notificationData.commentId = data.commentId;
    if (data.commentText) notificationData.commentText = data.commentText;

    await addDoc(notificationsColRef, notificationData);
  } catch (error) {
    console.error("Error creating notification:", error);
    // Non-critical, so don't throw, just log
  }
};


// --- Like ---
export const toggleLike = async (firestore: Firestore, postId: string, userId: string): Promise<boolean> => {
  const postRef = doc(firestore, 'posts', postId);
  const likeRef = doc(firestore, 'posts', postId, 'likes', userId);
  const userLikeRef = doc(firestore, 'users', userId, 'likes', postId);

  try {
    const likeSnap = await getDoc(likeRef);
    const batch = writeBatch(firestore);

    if (likeSnap.exists()) {
      // Unlike
      batch.delete(likeRef);
      batch.delete(userLikeRef);
      batch.update(postRef, { likesCount: increment(-1) });
      await batch.commit();
      return false;
    } else {
      // Like
      batch.set(likeRef, { createdAt: serverTimestamp() });
      batch.set(userLikeRef, { createdAt: serverTimestamp() });
      batch.update(postRef, { likesCount: increment(1) });
      await batch.commit();
      
      // Create notification
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
          const postData = postSnap.data();
          createNotification(firestore, {
              type: 'like',
              fromUserId: userId,
              toUserId: postData.authorId,
              postId: postId,
          });
      }

      return true;
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};


// --- Save ---
export const toggleSave = async (firestore: Firestore, postId: string, userId: string): Promise<boolean> => {
  const saveRef = doc(firestore, 'users', userId, 'saved', postId);
  try {
    const saveSnap = await getDoc(saveRef);
    if (saveSnap.exists()) {
      await deleteDoc(saveRef);
      return false;
    } else {
      await setDoc(saveRef, { createdAt: serverTimestamp() });
      return true;
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    throw error;
  }
};


// --- Comment ---
export const addComment = async (firestore: Firestore, postId: string, authorId: string, text: string) => {
    if (!text.trim()) throw new Error("Comment cannot be empty");

    const postRef = doc(firestore, 'posts', postId);
    const commentsColRef = collection(firestore, 'posts', postId, 'comments');

    try {
        const batch = writeBatch(firestore);

        const newCommentRef = doc(commentsColRef);
        batch.set(newCommentRef, {
            authorId,
            postId,
            text,
            createdAt: serverTimestamp(),
            likesCount: 0,
        });

        batch.update(postRef, { commentsCount: increment(1) });

        await batch.commit();
        
        // Create notification
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          createNotification(firestore, {
              type: 'comment',
              fromUserId: authorId,
              toUserId: postData.authorId,
              postId: postId,
              commentId: newCommentRef.id,
              commentText: text,
          });
      }

        return { success: true, commentId: newCommentRef.id };
    } catch (error) {
        console.error("Error adding comment:", error);
        return { success: false, error };
    }
};

// --- Follow ---
export const toggleFollow = async (firestore: Firestore, currentUserId: string, targetUserId: string): Promise<boolean> => {
    if (currentUserId === targetUserId) {
        console.error("Users cannot follow themselves.");
        throw new Error("Users cannot follow themselves.");
    }

    const currentUserFollowingRef = doc(firestore, 'users', currentUserId, 'following', targetUserId);
    const targetUserFollowersRef = doc(firestore, 'users', targetUserId, 'followers', currentUserId);
    const currentUserRef = doc(firestore, 'users', currentUserId);
    const targetUserRef = doc(firestore, 'users', targetUserId);

    try {
        const followingSnap = await getDoc(currentUserFollowingRef);
        const batch = writeBatch(firestore);

        if (followingSnap.exists()) {
            // Unfollow
            batch.delete(currentUserFollowingRef);
            batch.delete(targetUserFollowersRef);
            batch.update(currentUserRef, { followingCount: increment(-1) });
            batch.update(targetUserRef, { followersCount: increment(-1) });
            await batch.commit();
            return false;
        } else {
            // Follow
            batch.set(currentUserFollowingRef, { createdAt: serverTimestamp() });
            batch.set(targetUserFollowersRef, { createdAt: serverTimestamp() });
            batch.update(currentUserRef, { followingCount: increment(1) });
            batch.update(targetUserRef, { followersCount: increment(1) });
            await batch.commit();
            
            // Create notification
            createNotification(firestore, {
                type: 'follow',
                fromUserId: currentUserId,
                toUserId: targetUserId,
            });

            return true;
        }
    } catch (error) {
        console.error("Error toggling follow:", error);
        throw error;
    }
}

// --- Status Like ---
export const toggleStatusLike = async (firestore: Firestore, authorId: string, statusId: string, userId: string): Promise<boolean> => {
    const statusRef = doc(firestore, 'users', authorId, 'statuses', statusId);
    const likeRef = doc(firestore, 'users', authorId, 'statuses', statusId, 'likes', userId);

    try {
        const likeSnap = await getDoc(likeRef);
        const batch = writeBatch(firestore);

        if (likeSnap.exists()) {
            // Unlike
            batch.delete(likeRef);
            batch.update(statusRef, { likesCount: increment(-1) });
            await batch.commit();
            return false;
        } else {
            // Like
            batch.set(likeRef, { createdAt: serverTimestamp() });
            batch.update(statusRef, { likesCount: increment(1) });
            await batch.commit();
            return true;
        }
    } catch (error) {
        console.error("Error toggling status like:", error);
        throw error;
    }
}
