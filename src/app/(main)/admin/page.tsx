'use client';

import { BarChart2, Users, Settings, UserPlus, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, getDoc, setDoc, doc } from 'firebase/firestore';
import type { User as AppUser, Post } from '@/lib/types';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { format, subDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function AdminPage() {
  const { appUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [goLiveMin, setGoLiveMin] = useState(10);
  const [aiContentScanning, setAiContentScanning] = useState(false);
  const [aiSensitivity, setAiSensitivity] = useState('medium');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [growthPeriod, setGrowthPeriod] = useState('yearly');

  // Route protection
  useEffect(() => {
    if (!userLoading && (!appUser || appUser.role !== 'admin')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to view this page.',
        variant: 'destructive',
      });
      router.push('/home');
    }
  }, [appUser, userLoading, router, toast]);
  
  // Fetch users and settings
  useEffect(() => {
    if (!firestore || appUser?.role !== 'admin') return;

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // Fetch users
            const usersQuery = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as AppUser));
            setAllUsers(usersData);
            
            // Fetch posts
            const postsQuery = query(collection(firestore, 'posts'));
            const postsSnapshot = await getDocs(postsQuery);
            const postsData = postsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Post));
            setAllPosts(postsData);

            // Fetch settings
            const settingsRef = doc(firestore, 'config', 'appSettings');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                setGoLiveMin(settingsData.goLiveFollowerMinimum || 10);
                setAiContentScanning(settingsData.aiContentScanningEnabled || false);
                setAiSensitivity(settingsData.aiViolationSensitivity || 'medium');
            }

        } catch (error) {
            console.error("Error fetching admin data:", error);
            toast({ title: 'Error', description: 'Could not fetch admin data.', variant: 'destructive'});
        } finally {
            setLoadingData(false);
        }
    };
    fetchData();
  }, [firestore, toast, appUser]);
  
  const newUsersLast30Days = useMemo(() => {
    if (loadingData) return 0;
    const thirtyDaysAgo = subDays(new Date(), 30);
    return allUsers.filter(user => user.createdAt?.toDate() > thirtyDaysAgo).length;
  }, [allUsers, loadingData]);

  const growthData = useMemo(() => {
    if (loadingData) return [];
    const now = new Date();

    if (growthPeriod === 'yearly') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = now.getFullYear();
        const data = months.map(m => ({ name: m, users: 0 }));

        allUsers.forEach(user => {
            if (user.createdAt?.toDate) {
                const joinDate = user.createdAt.toDate();
                if (joinDate.getFullYear() === currentYear) {
                    const monthIndex = joinDate.getMonth();
                    data[monthIndex].users += 1;
                }
            }
        });
        const currentMonth = now.getMonth();
        return data.slice(0, currentMonth + 1);
    }

    if (growthPeriod === 'monthly') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const data = Array.from({ length: daysInMonth }, (_, i) => ({ name: `${i + 1}`, users: 0 }));

        allUsers.forEach(user => {
            if (user.createdAt?.toDate) {
                const joinDate = user.createdAt.toDate();
                if (joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth) {
                     const dayOfMonth = joinDate.getDate();
                     if(data[dayOfMonth - 1]) {
                        data[dayOfMonth - 1].users += 1;
                     }
                }
            }
        });
        return data.slice(0, now.getDate());
    }

    if (growthPeriod === 'weekly') {
        const sevenDaysAgo = subDays(now, 6); // includes today
        const data = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(now, 6 - i);
            return { name: format(date, 'EEE'), users: 0, date: date };
        });

        allUsers.forEach(user => {
            if (user.createdAt?.toDate) {
                const joinDate = user.createdAt.toDate();
                if (joinDate >= sevenDaysAgo && joinDate <= now) {
                    const dayIndex = data.findIndex(d => format(d.date, 'yyyy-MM-dd') === format(joinDate, 'yyyy-MM-dd'));
                    if (dayIndex !== -1) {
                        data[dayIndex].users += 1;
                    }
                }
            }
        });
        return data.map(({name, users}) => ({name, users}));
    }

    return [];
}, [allUsers, growthPeriod, loadingData]);

  const totalPosts = useMemo(() => allPosts.length, [allPosts]);
  
  const totalEngagements = useMemo(() => {
    if (loadingData) return 0;
    const totalLikes = allPosts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
    const totalComments = allPosts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
    return totalLikes + totalComments;
  }, [allPosts, loadingData]);
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
        return allUsers;
    }
    return allUsers.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, allUsers]);
  
  const handleSettingsSave = async () => {
    if (!firestore) return;
    setIsSavingSettings(true);
    try {
        const settingsRef = doc(firestore, 'config', 'appSettings');
        await setDoc(settingsRef, { 
            goLiveFollowerMinimum: Number(goLiveMin),
            aiContentScanningEnabled: aiContentScanning,
            aiViolationSensitivity: aiSensitivity
        }, { merge: true });
        toast({ title: 'Settings Saved', description: 'Your changes have been applied.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Could not save settings.', variant: 'destructive'});
        console.error("Error saving settings:", error);
    } finally {
        setIsSavingSettings(false);
    }
  }

  if (userLoading || !appUser || appUser.role !== 'admin') {
    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">Admin Panel</h1>
            <Skeleton className="w-full h-96" />
        </div>
    );
  }
  
  const handleUserAction = (action: 'deactivate' | 'delete', username: string) => {
    toast({
        title: 'Action not implemented',
        description: `This is a placeholder. You would ${action} user @${username}.`,
    });
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">Admin Panel</h1>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard"><BarChart2 className="w-4 h-4 mr-2"/>Dashboard</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2"/>Users</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2"/>Application Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingData ? '...' : allUsers.length}</div>
                        <p className="text-xs text-muted-foreground">Total registered users.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Users (30 Days)</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingData ? '...' : `+${newUsersLast30Days}`}</div>
                        <p className="text-xs text-muted-foreground">in the last 30 days</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingData ? '...' : totalPosts.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total posts created on the platform.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingData ? '...' : totalEngagements.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total likes and comments.</p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>User Growth</CardTitle>
                                <CardDescription>
                                    {growthPeriod === 'yearly' && `Monthly new user sign-ups for ${new Date().getFullYear()}.`}
                                    {growthPeriod === 'monthly' && `Daily new user sign-ups for ${format(new Date(), 'MMMM')}.`}
                                    {growthPeriod === 'weekly' && `Daily new user sign-ups for the last 7 days.`}
                                </CardDescription>
                            </div>
                            <Tabs value={growthPeriod} onValueChange={(value) => setGrowthPeriod(value as any)} className="w-auto">
                                <TabsList>
                                    <TabsTrigger value="yearly">Year</TabsTrigger>
                                    <TabsTrigger value="monthly">Month</TabsTrigger>
                                    <TabsTrigger value="weekly">Week</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent className="h-80">
                        {loadingData ? <Skeleton className="h-full w-full"/> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} allowDecimals={false} />
                                    <Tooltip cursor={{fill: 'hsla(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}} />
                                    <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users.</CardDescription>
                    <Input placeholder="Search by username, name, or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mt-4 max-w-sm"/>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="hidden sm:table-cell">Role</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingData ? [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-full"/></TableCell>
                                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-full"/></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-10 w-full"/></TableCell>
                                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-10 w-full"/></TableCell>
                                    <TableCell><Skeleton className="h-10 w-8"/></TableCell>
                                </TableRow>
                            )) : filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="w-8 h-8" />
                                            <div className="font-medium">
                                                <div className="font-bold">{user.username}</div>
                                                <div className="text-sm text-muted-foreground">{user.name}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{user.role}</TableCell>
                                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleUserAction('deactivate', user.username)}>Deactivate User</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleUserAction('delete', user.username)}>Delete User</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>App Features</CardTitle>
                    <CardDescription>Configure features across the application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingData ? <Skeleton className="h-10 w-64"/> : (
                        <div className="space-y-2">
                            <Label htmlFor="go-live-min">Go Live Follower Minimum</Label>
                            <Input id="go-live-min" type="number" value={goLiveMin} onChange={(e) => setGoLiveMin(Number(e.target.value))} className="max-w-xs"/>
                            <p className="text-sm text-muted-foreground">The minimum number of followers a user needs to start a live stream.</p>
                        </div>
                    )}
                </CardContent>
             </Card>
             
             <Card>
                <CardHeader>
                    <CardTitle>AI & Moderation</CardTitle>
                    <CardDescription>Manage AI-powered content moderation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingData ? <Skeleton className="h-24 w-full" /> : (
                        <>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-0.5">
                                    <Label htmlFor="ai-violation" className="text-base">Enable AI Content Scanning</Label>
                                    <p className="text-sm text-muted-foreground">Automatically scan uploaded content for violations.</p>
                                </div>
                                <Switch id="ai-violation" checked={aiContentScanning} onCheckedChange={setAiContentScanning} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai-sensitivity">Violation Sensitivity</Label>
                                <Select value={aiSensitivity} onValueChange={(value: 'low' | 'medium' | 'high') => setAiSensitivity(value)} disabled={!aiContentScanning}>
                                    <SelectTrigger id="ai-sensitivity" className="max-w-xs">
                                        <SelectValue placeholder="Select sensitivity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">Set the sensitivity for detecting potential violations.</p>
                            </div>
                        </>
                    )}
                </CardContent>
             </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Application Wide Settings</CardTitle>
                </CardHeader>
                <CardContent>
                     <Button onClick={handleSettingsSave} loading={isSavingSettings}>Save Settings</Button>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
