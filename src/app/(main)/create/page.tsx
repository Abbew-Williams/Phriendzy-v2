'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, ArrowLeft, User, Lock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { users } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/user-avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// ── MediaHost config ──────────────────────────────────────────────────────────
const MEDIAHOST_API = 'https://app.phriendzy.com/upload/api_upload.php';
const CHUNK_SIZE    = 2 * 1024 * 1024;  // 2 MB per chunk
const PARALLEL      = 4;                 // 4 chunks at once

const MAX_CAPTION_LENGTH = 10000;
const MAX_HASHTAGS       = 20;

// ── UUID helper ───────────────────────────────────────────────────────────────
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Chunked upload to MediaHost ───────────────────────────────────────────────
async function uploadToMediaHost(
  file: File,
  onProgress: (pct: number, label: string) => void
): Promise<{ url: string; direct_url: string; mime_type: string }> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const fileId      = uid();
  let   uploaded    = 0;
  let   bytesSent   = 0;
  const startTime   = Date.now();

  const chunkBlobs = Array.from({ length: totalChunks }, (_, i) =>
    file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
  );

  async function sendChunk(idx: number) {
    const form = new FormData();
    form.append('chunk', chunkBlobs[idx], 'chunk');

    const res = await fetch(MEDIAHOST_API, {
      method: 'POST',
      headers: {
        'X-Chunk-Index':  String(idx),
        'X-Total-Chunks': String(totalChunks),
        'X-File-Id':      fileId,
        'X-File-Name':    file.name,
        'X-File-Type':    file.type,
      },
      body: form,
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Server error (HTTP ${res.status}): ${text.slice(0, 150)}`);
    }

    if (!res.ok && data['done'] !== false)
      throw new Error((data['error'] as string) || `Chunk ${idx} failed`);

    uploaded++;
    bytesSent += chunkBlobs[idx].size;
    const elapsed = (Date.now() - startTime) / 1000 || 0.001;
    const mbps    = (bytesSent / elapsed / 1e6).toFixed(1);
    const pct     = Math.round((uploaded / totalChunks) * 100);

    onProgress(pct, `Fragment ${uploaded} of ${totalChunks} · ${mbps} MB/s`);
    return data;
  }

  let lastResult: Record<string, unknown> = {};
  for (let i = 0; i < totalChunks; i += PARALLEL) {
    const count   = Math.min(PARALLEL, totalChunks - i);
    const results = await Promise.all(
      Array.from({ length: count }, (_, j) => sendChunk(i + j))
    );
    lastResult = results[results.length - 1];
  }

  if (!lastResult['direct_url'])
    throw new Error('Upload finished but server did not return a URL.');

  return {
    url:        lastResult['url']        as string,
    direct_url: lastResult['direct_url'] as string,
    mime_type:  lastResult['mime_type']  as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const [file, setFile]               = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [caption, setCaption]         = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');

  const [privacy, setPrivacy]             = useState<'public' | 'friends' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet]         = useState(true);
  const [allowStitch, setAllowStitch]     = useState(true);

  const [mentionQuery, setMentionQuery]             = useState('');
  const [showMentionPopover, setShowMentionPopover] = useState(false);

  const router      = useRouter();
  const { toast }   = useToast();
  const { user }    = useUser();
  const firestore   = useFirestore();
  const captionRef  = useRef<HTMLTextAreaElement>(null);

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Client-side size check — MediaHost supports up to 100 MB
    if (selected.size > 100 * 1024 * 1024) {
      toast({
        title:       'File too large',
        description: `${selected.name} exceeds the 100 MB limit.`,
        variant:     'destructive',
      });
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selected);
  };

  // ── Caption / mention helpers ───────────────────────────────────────────────
  const hashtagCount = useMemo(() => (caption.match(/#/g) || []).length, [caption]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length > MAX_CAPTION_LENGTH) return;
    setCaption(text);

    const { selectionStart }  = e.target;
    const textBeforeCursor    = text.substring(0, selectionStart);
    const lastAt              = textBeforeCursor.lastIndexOf('@');
    const lastSpace           = textBeforeCursor.lastIndexOf(' ');

    if (lastAt > lastSpace) {
      setMentionQuery(textBeforeCursor.substring(lastAt + 1));
      setShowMentionPopover(true);
    } else {
      setShowMentionPopover(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const { selectionStart } = captionRef.current!;
    const textBeforeCursor   = caption.substring(0, selectionStart);
    const lastAt             = textBeforeCursor.lastIndexOf('@');
    const newCaption = `${caption.substring(0, lastAt)}@${username} ${caption.substring(selectionStart)}`;
    setCaption(newCaption);
    setShowMentionPopover(false);
    setTimeout(() => {
      captionRef.current?.focus();
      const pos = lastAt + username.length + 2;
      captionRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const filteredUsers = useMemo(
    () =>
      mentionQuery
        ? users
            .filter(u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) && u.id !== user?.uid)
            .slice(0, 5)
        : [],
    [mentionQuery, user]
  );

  const discardPost = () => {
    setFile(null);
    setPreviewUrl(null);
    setCaption('');
    setPrivacy('public');
    setAllowComments(true);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an image or video.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Login required', description: 'You must be logged in to post.', variant: 'destructive' });
      return;
    }
    if (!firestore) {
      toast({ title: 'Not ready', description: 'Database not connected yet.', variant: 'destructive' });
      return;
    }
    if (hashtagCount > MAX_HASHTAGS) {
      toast({ title: 'Too many hashtags', description: `Max ${MAX_HASHTAGS} hashtags allowed.`, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadLabel('Starting upload…');

    try {
      // ── Step 1: Upload file to MediaHost ──────────────────────────────────
      const media = await uploadToMediaHost(file, (pct, label) => {
        setUploadProgress(pct);
        setUploadLabel(label);
      });

      // ── Step 2: Save post to Firestore ────────────────────────────────────
      setUploadLabel('Saving post…');
      const isVideo = file.type.startsWith('video/');

      await addDoc(collection(firestore, 'posts'), {
        authorId:          user.uid,
        caption,
        privacy,
        allowComments,
        allowDuet,
        allowStitch,
        createdAt:         serverTimestamp(),

        // ── MediaHost fields (page.tsx reads mediaHostUrl to show the media) ─
        mediaHostUrl:      media.direct_url,   // ← direct raw file URL
        mediaHostShareUrl: media.url,           // ← viewer page URL
        mimeType:          media.mime_type,     // ← e.g. "video/mp4"
        isVideo,

        // Counters
        likesCount:    0,
        commentsCount: 0,
        sharesCount:   0,
      });

      toast({ title: 'Post published! 🎉', description: 'Your post is now live.' });
      router.push('/home');

    } catch (error: unknown) {
      console.error('Error creating post:', error);
      const msg = error instanceof Error ? error.message : 'Could not create your post. Please try again.';
      toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // ── File picker screen ──────────────────────────────────────────────────────
  if (!previewUrl) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft />
              </Button>
              <CardTitle>Create new post</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <ImagePlus className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-1">Select photo or video</h2>
                <p className="text-sm text-muted-foreground">Drag & drop or click · up to 100 MB</p>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Post details screen ─────────────────────────────────────────────────────
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <form onSubmit={handleSubmit}>
        <Card className="overflow-hidden md:max-w-5xl md:mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setPreviewUrl(null)} disabled={isUploading}>
                <ArrowLeft />
              </Button>
              <CardTitle>Create new post</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[60vh]">

              {/* ── Media preview ── */}
              <div className="relative w-full bg-black flex items-center justify-center rounded-md overflow-hidden">
                {file?.type.startsWith('image/') ? (
                  <Image src={previewUrl!} alt="Preview" fill style={{ objectFit: 'contain' }} />
                ) : (
                  <video
                    src={previewUrl!}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-[80vh] w-auto"
                  />
                )}
              </div>

              {/* ── Form ── */}
              <div className="p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar user={user} />
                  <span className="font-bold">{user?.displayName}</span>
                </div>

                <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
                  <PopoverTrigger asChild>
                    <Textarea
                      ref={captionRef}
                      placeholder="Write a caption… (e.g. #summer @phriend)"
                      value={caption}
                      onChange={handleCaptionChange}
                      className="flex-grow resize-none text-base"
                      maxLength={MAX_CAPTION_LENGTH}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <div className="flex flex-col">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleMentionSelect(u.username)}
                            className="flex items-center gap-2 p-2 hover:bg-muted text-left"
                          >
                            <UserAvatar user={u} className="w-8 h-8" />
                            <div>
                              <p className="font-semibold text-sm">{u.username}</p>
                              <p className="text-xs text-muted-foreground">{u.name}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="p-4 text-sm text-muted-foreground text-center">No users found</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{caption.length}/{MAX_CAPTION_LENGTH}</span>
                  <span className={hashtagCount > MAX_HASHTAGS ? 'text-destructive' : ''}>
                    {hashtagCount}/{MAX_HASHTAGS} hashtags
                  </span>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4 text-sm">
                  <p className="font-semibold">Who can watch this</p>
                  <RadioGroup value={privacy} onValueChange={(v: 'public' | 'friends' | 'private') => setPrivacy(v)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2"><Users className="w-4 h-4" /> Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friends" id="friends" />
                      <Label htmlFor="friends" className="flex items-center gap-2"><User className="w-4 h-4" /> Friends</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2"><Lock className="w-4 h-4" /> Private</Label>
                    </div>
                  </RadioGroup>

                  <Separator className="my-4" />

                  <p className="font-semibold">Allow users to:</p>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-comments">Comment</Label>
                    <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-duet">Duet</Label>
                    <Switch id="allow-duet" checked={allowDuet} onCheckedChange={setAllowDuet} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-stitch">Stitch</Label>
                    <Switch id="allow-stitch" checked={allowStitch} onCheckedChange={setAllowStitch} />
                  </div>
                </div>

                <div className="mt-auto pt-6 flex flex-col gap-4">
                  {isUploading && (
                    <div className="w-full space-y-1">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">
                        {uploadLabel || `Uploading… ${uploadProgress}%`}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={discardPost}
                      disabled={isUploading}
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isUploading}
                    >
                      {isUploading ? `${uploadProgress}%` : 'Post'}
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}