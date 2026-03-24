'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Video, Mic, VideoOff, MicOff } from 'lucide-react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createLiveStream } from '@/firebase/firestore/live';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GoLivePage() {
    const { user, appUser, loading: userLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    // Effect to get permissions and stream
    useEffect(() => {
        let isMounted = true;
        const getPermissions = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (isMounted) {
                    setMediaStream(stream);
                    setHasCameraPermission(true);
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
                if (isMounted) {
                    setHasCameraPermission(false);
                }
            }
        };
        getPermissions();

        return () => {
            isMounted = false;
        };
    }, []);

    // Effect to attach stream to video element and handle cleanup
    useEffect(() => {
        if (videoRef.current && mediaStream) {
            videoRef.current.srcObject = mediaStream;
        }
        
        return () => {
            // Stop all tracks when the component unmounts or the stream is replaced
            mediaStream?.getTracks().forEach(track => track.stop());
        }
    }, [mediaStream]);


    const toggleCamera = () => {
        const videoTrack = mediaStream?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !isCameraOn;
            setIsCameraOn(!isCameraOn);
        }
    };

    const toggleMic = () => {
        const audioTrack = mediaStream?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !isMicOn;
            setIsMicOn(!isMicOn);
        }
    };

    const handleGoLive = async () => {
        if (!user) {
            toast({ title: 'You must be logged in to go live.', variant: 'destructive' });
            return;
        }
        if (!title.trim()) {
            toast({ title: 'Please enter a title for your stream.', variant: 'destructive' });
            return;
        }
        setIsStarting(true);
        const { success, streamId, error } = await createLiveStream(user, title);
        if (success && streamId) {
            toast({ title: 'Going Live!', description: 'Your stream is starting now.' });
            router.push(`/live/${streamId}`);
        } else {
            toast({ title: 'Error starting stream', description: error?.message || 'Could not start live stream.', variant: 'destructive' });
            setIsStarting(false);
        }
    };

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft />
                        </Button>
                        <CardTitle>Go Live</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        {!isCameraOn && <VideoOff className="w-16 h-16 text-muted-foreground absolute" />}
                        {hasCameraPermission === false && (
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                                <Alert variant="destructive">
                                    <AlertTitle>Camera or Mic Unavailable</AlertTitle>
                                    <AlertDescription>
                                        Could not access your camera and microphone. Please ensure they are connected and not in use by another application.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Stream Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Q&A Session, Morning Coffee Chat"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch id="camera" checked={isCameraOn} onCheckedChange={toggleCamera} disabled={!hasCameraPermission}/>
                                <Label htmlFor="camera" className="flex items-center gap-1">{isCameraOn ? <Video /> : <VideoOff />} Camera</Label>
                            </div>
                             <div className="flex items-center gap-2">
                                <Switch id="mic" checked={isMicOn} onCheckedChange={toggleMic} disabled={!hasCameraPermission}/>
                                <Label htmlFor="mic" className="flex items-center gap-1">{isMicOn ? <Mic /> : <MicOff />} Microphone</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleGoLive} loading={isStarting} disabled={!hasCameraPermission || isStarting}>
                        Go Live Now
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
