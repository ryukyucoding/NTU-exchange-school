// Social feature types

export type PostStatus = 'draft' | 'published' | 'deleted';
export type PostType = 'general' | 'review';

export interface Post {
  id: string;
  title: string;
  content: string;
  status: PostStatus;
  authorId: string;
  repostedPostId?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    userID: string | null;
    image: string | null;
    email: string | null;
  };
  hashtags?: string[];
  photos?: PostPhoto[];
  ratings?: SchoolRating;
  schools?: School[];
  postType: PostType;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked?: boolean;
}

export interface PostPhoto {
  id: string;
  postId: string;
  url: string;
  photoId: string;
  order: number;
  alt?: string;
  createdAt: string;
}

export interface SchoolRating {
  postId: string;
  schoolId: string;
  livingConvenience: number; // 1-5 生活機能
  costOfLiving: number; // 1-5 物價水準
  courseLoading: number; // 1-5 課程負擔
}

export interface Hashtag {
  postId: string;
  content: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string; // 使用 userId 而不是 authorId
  postId: string;
  parentId?: string; // 使用 parentId 而不是 parentCommentId
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string | null;
    userID: string | null;
    image: string | null;
  };
}

export interface School {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
}

