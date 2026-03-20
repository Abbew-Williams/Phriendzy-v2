'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, ArrowLeft, Scissors, Music, Wand2, Type, User, Lock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { uploadFile } from '@/firebase/storage';
import { createPost } from '@/firebase/firestore/posts';
import { users } from '@/lib/data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/user-avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const MAX_CAPTION_LENGTH = 10000;
const MAX_HASHTAGS = 20;

type CreateStep = 'select' | 'edit' | 'details';

export default function CreatePage() {
  const [step, setStep] = useState<CreateStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionPopover, setShowMentionPopover] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ title: 'File too large', description: 'Please select a file smaller than 50MB.', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setStep('edit');
    }
  };
  
  const hashtagCount = useMemo(() => (caption.match(/#/g) || []).length, [caption]);

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length > MAX_CAPTION_LENGTH) return;
    setCaption(text);

    const { selectionStart } = e.target;
    const textBeforeCursor = text.substring(0, selectionStart);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastSpace = textBeforeCursor.lastIndexOf(' ');

    if (lastAt > lastSpace) {
      const query = textBeforeCursor.substring(lastAt + 1);
      setMentionQuery(query);
      setShowMentionPopover(true);
    } else {
      setShowMentionPopover(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const { selectionStart } = captionRef.current!;
    const textBeforeCursor = caption.substring(0, selectionStart);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    const newCaption = `${caption.substring(0, lastAt)}@${username} ${caption.substring(selectionStart)}`;
    
    setCaption(newCaption);
    setShowMentionPopover(false);

    setTimeout(() => {
        captionRef.current?.focus();
        const newCursorPosition = lastAt + username.length + 2;
        captionRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };
  
  const filteredUsers = useMemo(() => 
    mentionQuery 
      ? users.filter(u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) && u.id !== user?.uid).slice(0, 5)
      : [],
  [mentionQuery, user]);


  const discardPost = () => {
    setFile(null);
    setPreviewUrl(null);
    setCaption('');
    setPrivacy('public');
    setAllowComments(true);
    setStep('select');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an image or video.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Authentication required', description: 'You need to be logged in to create a post.', variant: 'destructive' });
      return;
    }
     if (hashtagCount > MAX_HASHTAGS) {
      toast({ title: 'Too many hashtags', description: `You can only use up to ${MAX_HASHTAGS} hashtags.`, variant: 'destructive'});
      return;
    }

    setIsUploading(true);

    try {
      const filePath = `posts/${user.uid}/${Date.now()}_${file.name}`;
      const mediaUrl = await uploadFile(file, filePath);
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

      await createPost({
        authorId: user.uid,
        caption,
        mediaUrl,
        mediaType,
        privacy,
        allowComments,
        allowDuet,
        allowStitch,
      });

      toast({ title: 'Post Created!', description: 'Your post is now live.' });
      router.push('/home');

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not create your post.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };
  
  if (step === 'select') {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6">
             <div className="relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <ImagePlus className="w-12 h-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-1">Select photos or videos</h2>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                </label>
                <input id="file-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'edit') {
    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <Card className="overflow-hidden md:max-w-5xl md:mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => discardPost()}>
                            <ArrowLeft />
                        </Button>
                        <CardTitle>Edit</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] min-h-[60vh] gap-4">
                        <div className="relative w-full bg-black flex items-center justify-center rounded-md overflow-hidden">
                            {previewUrl && file?.type.startsWith('image/') ? (
                                <Image src={previewUrl} alt="Preview" fill objectFit="contain" />
                            ) : (
                                <video src={previewUrl!} controls autoPlay loop muted className="max-h-[80vh] w-auto" />
                            )}
                        </div>
                        <div className="flex flex-col border rounded-md bg-background p-4 space-y-2">
                            <p className="font-semibold text-muted-foreground">Editing Tools</p>
                            <Button variant="ghost" className="justify-start"><Scissors className="mr-2 h-4 w-4" /> Trim</Button>
                            <Button variant="ghost" className="justify-start"><Music className="mr-2 h-4 w-4" /> Music</Button>
                            <Button variant="ghost" className="justify-start"><Wand2 className="mr-2 h-4 w-4" /> Effects</Button>
                            <Button variant="ghost" className="justify-start"><Type className="mr-2 h-4 w-4" /> Text</Button>
                            <div className="!mt-auto pt-6 flex flex-col gap-2">
                                <Button onClick={() => setStep('details')} className="w-full">Next</Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <form onSubmit={handleSubmit}>
        <Card className="overflow-hidden md:max-w-5xl md:mx-auto">
          <CardHeader>
              <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setStep('edit')}>
                      <ArrowLeft />
                  </Button>
                  <CardTitle>Create new post</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[60vh]">
              {/* Media Preview */}
              <div className="relative w-full bg-black flex items-center justify-center rounded-md overflow-hidden">
                {previewUrl && file?.type.startsWith('image/') ? (
                  <Image src={previewUrl} alt="Preview" fill objectFit="contain" />
                ) : (
                  <video src={previewUrl!} controls autoPlay loop muted className="max-h-[80vh] w-auto" />
                )}
              </div>

              {/* Post Details Form */}
              <div className="p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar user={user} />
                  <span className="font-bold">{user?.displayName}</span>
                </div>
                
                <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
                    <PopoverTrigger asChild>
                        <Textarea
                          ref={captionRef}
                          id="caption"
                          placeholder="Write a caption... (e.g. #summer, @phriend)"
                          value={caption}
                          onChange={handleCaptionChange}
                          className="flex-grow resize-none text-base"
                          maxLength={MAX_CAPTION_LENGTH}
                        />
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                        <div className="flex flex-col">
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <button key={u.id} type="button" onClick={() => handleMentionSelect(u.username)} className="flex items-center gap-2 p-2 hover:bg-muted text-left">
                                    <UserAvatar user={u} className="w-8 h-8" />
                                    <div>
                                        <p className="font-semibold text-sm">{u.username}</p>
                                        <p className="text-xs text-muted-foreground">{u.name}</p>
                                    </div>
                                </button>
                            )) : <p className="p-4 text-sm text-muted-foreground text-center">No users found</p>}
                        </div>
                    </PopoverContent>
                </Popover>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{caption.length}/{MAX_CAPTION_LENGTH}</span>
                  <span className={hashtagCount > MAX_HASHTAGS ? 'text-destructive' : ''}>{hashtagCount}/{MAX_HASHTAGS} hashtags</span>
                </div>
                
                <Separator className="my-4"/>

                <div className="space-y-4 text-sm">
                  <p className="font-semibold">Who can watch this</p>
                  <RadioGroup value={privacy} onValueChange={(v: any) => setPrivacy(v)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="flex items-center gap-2"><Users className="w-4 h-4"/> Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friends" id="friends" />
                      <Label htmlFor="friends" className="flex items-center gap-2"><User className="w-4 h-4"/> Friends</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="flex items-center gap-2"><Lock className="w-4 h-4"/> Private</Label>
                    </div>
                  </RadioGroup>

                  <Separator className="my-4"/>

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

                <div className="mt-auto pt-6 flex gap-2">
                  <Button type="button" variant="outline" className="w-full" onClick={discardPost}>Discard</Button>
                  <Button type="submit" className="w-full" loading={isUploading}>Post</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
