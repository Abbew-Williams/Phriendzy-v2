export type User = {
  id: string; // Corresponds to uid in Firebase Auth
  uid: string;
  username: string;
  name?: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  firstName?: string;
  lastName?: string;
  usernameLastChanged?: any; // Can be a Firestore Timestamp
};

export type Post = {
  id: string;
  author: User; // Populated client-side for UI
  authorId: string; // Stored in Firestore
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likesCount: number;
  commentsCount: number;
  createdAt: any; // Can be Firestore Timestamp or string
  privacy: 'public' | 'friends' | 'private';
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
};

export type Comment = {
  id: string;
  author: User; // Populated client-side for UI
  authorId: string;
  postId: string;
  text: string;
  createdAt: any; // Firestore timestamp
  likesCount?: number;
  parentId?: string | null;
};
