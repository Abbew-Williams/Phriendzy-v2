'use client';

import { BarChart2, Users, Mail, ShieldAlert, UserPlus, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/user-avatar';
import { format } from 'date-fns';
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

// Mock data for the chart
const chartData = [
  { month: 'Jan', users: Math.floor(Math.random() * 100) + 10 },
  { month: 'Feb', users: Math.floor(Math.random() * 100) + 20 },
  { month: 'Mar', users: Math.floor(Math.random() * 100) + 30 },
  { month: 'Apr', users: Math.floor(Math.random() * 100) + 40 },
  { month: 'May', users: Math.floor(Math.random() * 100) + 50 },
  { month: 'Jun', users: Math.floor(Math.random() * 100) + 60 },
];

export default function AdminPage() {
  const { appUser, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
  
  // Fetch users for the user management table
  useEffect(() => {
    if (!firestore || appUser?.role !== 'admin') return;

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const usersQuery = query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(usersQuery);
            const usersData = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as AppUser));
            setAllUsers(usersData);
        } catch (error) {
            console.error("Error fetching users for admin panel:", error);
            toast({ title: 'Error', description: 'Could not fetch users.', variant: 'destructive'});
        } finally {
            setLoadingUsers(false);
        }
    };
    fetchAllUsers();
  }, [firestore, toast, appUser]);
  
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
          <TabsTrigger value="settings"><Mail className="w-4 h-4 mr-2"/>SMTP Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingUsers ? '...' : allUsers.length}</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Users (Month)</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+2,350</div>
                        <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reported Issues</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12</div>
                        <p className="text-xs text-muted-foreground">+5 since last week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">57.8%</div>
                        <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth</CardTitle>
                        <CardDescription>Monthly new user sign-ups.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip cursor={{fill: 'hsla(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}} />
                                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
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
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="hidden md:table-cell">Role</TableHead>
                                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingUsers ? [...Array(5)].map((_, i) => (
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
                                    <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                                    <TableCell className="hidden md:table-cell">{user.role}</TableCell>
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
        
        <TabsContent value="settings" className="mt-6">
             <Card>
                <CardHeader>
                    <CardTitle>SMTP Email Settings</CardTitle>
                    <CardDescription>Configure the server for outgoing emails. This is a placeholder.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtp-server">SMTP Server</Label>
                        <Input id="smtp-server" placeholder="smtp.example.com" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="smtp-port">Port</Label>
                        <Input id="smtp-port" placeholder="587" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smtp-user">Username</Label>
                        <Input id="smtp-user" placeholder="user@example.com" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="smtp-pass">Password</Label>
                        <Input id="smtp-pass" type="password" />
                    </div>
                    <Button onClick={() => toast({ title: 'Settings Saved', description: 'This is a placeholder.'})}>Save Settings</Button>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
