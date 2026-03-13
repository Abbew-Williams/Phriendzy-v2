'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const profileFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  bio: z.string().max(150, 'Bio cannot be more than 150 characters.').optional(),
});

export default function EditProfilePage() {
  const { appUser, loading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      bio: '',
    },
  });
  
  useEffect(() => {
    if (appUser) {
      form.reset({
        username: appUser.username,
        firstName: appUser.firstName || '',
        lastName: appUser.lastName || '',
        bio: appUser.bio || '',
      });
    }
  }, [appUser, form]);


  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsSaving(true);
    console.log('Saving profile data:', values);

    // TODO: Implement actual Firestore update logic here
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate save

    toast({
      title: 'Profile Updated',
      description: 'Your changes have been saved.',
    });
    setIsSaving(false);
    router.push('/profile');
  };

  if (loading || !appUser) {
    return (
      <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">Edit Profile</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex items-center gap-6">
            <UserAvatar user={appUser} className="w-20 h-20" />
            <div>
              <h2 className="text-xl font-semibold">{appUser.username}</h2>
              <Button variant="link" className="p-0 h-auto text-primary">Change profile photo</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Tell us about yourself" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" loading={isSaving}>Save Changes</Button>
        </form>
      </Form>
    </div>
  );
}
