export type User = {
  id: string; // Corresponds to uid in Firebase Auth
  uid: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  firstName?: string;
  lastName?: string;
  usernameLastChanged?: any; // Can be a Firestore Timestamp
  role?: 'user' | 'admin';
  createdAt?: any;
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

export type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  fromUser: User;
  post?: Post;
  commentText?: string;
  read: boolean;
  createdAt: any; // Can be Firestore Timestamp or string
};

export type Status = {
    id: string;
    authorId: string;
    author: User;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    createdAt: any;
    expiresAt: any;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
};

export type StatusComment = {
  id: string;
  author: User;
  authorId: string;
  text: string;
  createdAt: any; // Firestore timestamp
  parentId?: string | null;
  replies?: StatusComment[];
  repliesCount?: number;
};

export type Chat = {
    id: string;
    participants: User[];
    lastMessage: string;
    lastMessageTimestamp: any;
    unreadCount: number;
    updatedAt: any;
    createdAt: any;
    lastMessageAuthorId?: string;
};

export type Message = {
    id: string;
    authorId: string;
    text: string;
    createdAt: any; // Can be Firestore Timestamp
}

export type LiveStream = {
    id: string;
    hostId: string;
    host: User; // Populated client-side
    title: string;
    status: 'active' | 'ended';
    viewerCount: number;
    createdAt: any;
}

export type LiveStreamComment = {
    id: string;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl: string;
    text: string;
    createdAt: any; // Firestore timestamp
}
