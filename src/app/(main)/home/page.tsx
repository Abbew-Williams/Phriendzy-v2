import { PostCard } from '@/components/post-card';
import { posts } from '@/lib/data';

export default function HomePage() {
  return (
    <div className="w-full h-full">
      <div className="container mx-auto max-w-screen-sm px-0 md:px-4 py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-lg space-y-8">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
