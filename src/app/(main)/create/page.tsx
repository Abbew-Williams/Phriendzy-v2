'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

export default function CreatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearPreview = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an image or video to post.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // TODO: Implement actual upload to Firebase Storage
    // and creation of post document in Firestore.
    console.log('Uploading file:', file.name);
    console.log('Caption:', caption);

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload

    toast({
      title: 'Post Created!',
      description: 'Your post is now live.',
    });

    setIsUploading(false);
    router.push('/home');
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-6">Create Post</h1>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6">
              <div>
                {!previewUrl ? (
                  <div className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                      <ImagePlus className="w-10 h-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload image or video</p>
                    </label>
                    <input id="file-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted">
                    {file?.type.startsWith('image/') ? (
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    ) : (
                      <video src={previewUrl} controls className="w-full h-full object-cover" />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={clearPreview}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="caption" className="font-medium">Caption</label>
                <Textarea
                  id="caption"
                  placeholder="Write a caption... (e.g. #summer, @phriend)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full" loading={isUploading}>
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
