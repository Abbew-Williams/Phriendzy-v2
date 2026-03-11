export type User = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followers: number;
  following: number;
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
