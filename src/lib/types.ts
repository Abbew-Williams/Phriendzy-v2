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
  author: User;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
};

export type Comment = {
  id: string;
  author: User;
  text: string;
  createdAt: string;
};
