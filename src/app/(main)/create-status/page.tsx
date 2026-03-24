'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImagePlus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { uploadFile } from '@/firebase/storage';
import { createStatus } from '@/firebase/firestore/statuses';
import { Progress } from '@/components/ui/progress';

export default function CreateStatusPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit for status
        toast({ title: 'File too large', description: 'Please select a file smaller than 20MB.', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const discardStatus = () => {
    setFile(null);
    setPreviewUrl(null);
    router.back();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast({ title: 'No file selected', description: 'Please select an image or video.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Authentication required', description: 'You need to be logged in to post a status.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const mediaUrl = await uploadFile(file, setUploadProgress);
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

      await createStatus({
        authorId: user.uid,
        mediaUrl,
        mediaType,
      });

      toast({ title: 'Status Posted!', description: 'Your status is live for 24 hours.' });
      router.push('/messages');

    } catch (error: any) {
      console.error('Error creating status:', error);
      let description = 'Could not post your status. Please try again.';
      if (error?.code === 'storage/unauthorized') {
          description = 'You do not have permission to upload this file. Please check the Storage security rules in your Firebase project.';
      } else if (error.message) {
          description = error.message;
      }
      toast({ title: 'Upload Failed', description, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  if (!previewUrl) {
     return (
      <div className="w-full p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg">
          <CardHeader>
             <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => router.back()}>
                      <ArrowLeft />
                  </Button>
                  <CardTitle>Create new status</CardTitle>
              </div>
          </CardHeader>
          <CardContent className="p-6">
             <div className="relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <ImagePlus className="w-12 h-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-1">Select photo or video</h2>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                </label>
                <input id="file-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
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
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={discardStatus} disabled={isUploading}>
                                <ArrowLeft />
                            </Button>
                            <CardTitle>Preview</CardTitle>
                        </div>
                        <Button type="submit" loading={isUploading} disabled={isUploading}>Post Status</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full bg-black flex items-center justify-center rounded-md overflow-hidden min-h-[60vh]">
                        {file?.type.startsWith('image/') ? (
                            <Image src={previewUrl} alt="Preview" fill objectFit="contain" />
                        ) : (
                            <video src={previewUrl!} controls autoPlay loop muted className="max-h-[80vh] w-auto" />
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 p-4">
                                <Progress value={uploadProgress} className="w-full max-w-sm" />
                                <p className="text-white font-semibold">Uploading... {uploadProgress}%</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </form>
     </div>
  )
}
