'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FullScreenPost } from '@/components/full-screen-post';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import type { Post, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Extend Post with the MediaHost fields we save in create/page.tsx
type PostWithMedia = Post & {
  mediaHostUrl:      string;   // direct raw file URL  → used in <video> / <img>
  mediaHostShareUrl: string;   // viewer page URL      → optional
  mimeType:          string;   // e.g. "video/mp4"
  isVideo:           boolean;
};

export default function HomePage() {
  const { user }    = useUser();
  const firestore   = useFirestore();
  const { toast }   = useToast();
  const [posts, setPosts]     = useState<PostWithMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) { setLoading(false); return; }
    setLoading(true);

    const postsQuery = query(collection(firestore, 'posts'));

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      try {
        const postsData = await Promise.all(
          snapshot.docs.map(async (postDoc) => {
            const data = postDoc.data();

            // Only show public posts that have an author
            if (!data.authorId || data.privacy !== 'public') return null;

            // ── Resolve media URL ────────────────────────────────────────────
            // Priority: mediaHostUrl (saved by create/page.tsx) → legacy fallbacks
            const mediaHostUrl: string =
              data.mediaHostUrl  ||
              data.mediaUrl      ||
              data.videoUrl      ||
              data.imageUrl      ||
              '';

            // Skip posts with no media
            if (!mediaHostUrl) return null;

            // Detect video vs image
            const mime: string  = data.mimeType || '';
            const isVideo: boolean =
              data.isVideo === true ||
              mime.startsWith('video/') ||
              /\.(mp4|webm|ogg|mov)(\?|$)/i.test(mediaHostUrl);

            // ── Resolve author ───────────────────────────────────────────────
            const authorRef  = doc(firestore, 'users', data.authorId);
            const authorSnap = await getDoc(authorRef);

            const author: User = authorSnap.exists()
              ? ({ id: authorSnap.id, uid: authorSnap.id, ...authorSnap.data() } as User)
              : {
                  id:             data.authorId,
                  uid:            data.authorId,
                  username:       'unknown_user',
                  avatarUrl:      `https://picsum.photos/seed/${data.authorId}/100/100`,
                  bio:            '',
                  followersCount: 0,
                  followingCount: 0,
                };

            return {
              ...data,
              id:                postDoc.id,
              author,
              mediaHostUrl,
              mediaHostShareUrl: data.mediaHostShareUrl || '',
              mimeType:          mime,
              isVideo,
            } as PostWithMedia;
          })
        );

        let allPosts = postsData.filter(Boolean) as PostWithMedia[];

        // Newest first
        allPosts.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });

        setPosts(allPosts);
      } catch (err) {
        console.error('Error processing posts:', err);
        toast({ title: 'Error', description: 'Could not load posts.', variant: 'destructive' });
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Snapshot error:', err);
      toast({ title: 'Error', description: 'Could not fetch posts.', variant: 'destructive' });
      setPosts([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  // ── Interaction guard ───────────────────────────────────────────────────────
  const handleInteraction = () => {
    if (!user) {
      toast({
        title:       'Login Required',
        description: 'Log in to interact with posts.',
        variant:     'destructive',
      });
      return false;
    }
    return true;
  };

  // ── Intersection observer: autoplay video in viewport ──────────────────────
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || posts.length === 0) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = (entry.target as HTMLElement).querySelector('video');
          if (!video) return;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      { threshold: 0.6 }
    );

    const els = document.querySelectorAll('[data-post-id]');
    els.forEach((el) => observer.current!.observe(el));
    return () => els.forEach((el) => observer.current!.unobserve(el));
  }, [posts]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden md:mx-auto md:max-w-md md:border-x no-scrollbar">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-full w-full snap-start flex items-center justify-center relative bg-black">
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    );
  }

  // ── Feed ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full snap-y snap-mandatory overflow-y-auto overflow-x-hidden md:mx-auto md:max-w-md md:border-x no-scrollbar">
      {posts.length > 0 ? (
        posts.map((post) => (
          <div
            key={post.id}
            data-post-id={post.id}
            className="h-full w-full snap-start relative bg-black overflow-hidden"
          >
            {/* ── Full-bleed media layer ── */}
            <MediaLayer post={post} />

            {/* ── UI overlay (likes, comments, caption, avatar, etc.) ── */}
            <div className="absolute inset-0 z-10">
              <FullScreenPost post={post} onInteraction={handleInteraction} />
            </div>
          </div>
        ))
      ) : (
        <div className="h-full w-full snap-start flex items-center justify-center text-white">
          <div className="text-center px-6">
            <h2 className="text-2xl font-bold">Welcome to Phriendzy!</h2>
            <p className="text-muted-foreground mt-2">
              No public posts yet — create one to get started!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MediaLayer
//  Renders full-bleed video or image from mediaHostUrl.
//  Sits at z-0 behind the FullScreenPost overlay.
// ─────────────────────────────────────────────────────────────────────────────
function MediaLayer({ post }: { post: PostWithMedia }) {
  const [mediaError, setMediaError] = useState(false);

  const { mediaHostUrl, isVideo } = post;
  if (!mediaHostUrl) return null;

  if (mediaError) {
    return (
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black text-white/40 gap-3">
        <span className="text-5xl">{isVideo ? '🎬' : '🖼️'}</span>
        <span className="text-sm">Media could not be loaded</span>
        <a
          href={mediaHostUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline opacity-50 hover:opacity-100"
        >
          Try opening directly ↗
        </a>
      </div>
    );
  }

  // ── Video ─────────────────────────────────────────────────────────────────
  if (isVideo) {
    return (
      <video
        src={mediaHostUrl}
        className="absolute inset-0 z-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onError={() => setMediaError(true)}
      />
    );
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaHostUrl}
      alt={post.caption || 'Post image'}
      className="absolute inset-0 z-0 w-full h-full object-cover"
      crossOrigin="anonymous"
      onError={() => setMediaError(true)}
    />
  );
}