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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { serverTimestamp } from 'firebase/firestore';
import { updateUserProfile } from '@/firebase/firestore/users';
import { uploadFile } from '@/firebase/storage';

const profileFormSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  bio: z.string().max(150, 'Bio cannot be more than 150 characters.').optional(),
});

// A mock function to simulate checking username availability
const checkUsernameAvailability = async (username: string): Promise<{ available: boolean; suggestions: string[] }> => {
  console.log(`Checking username: ${username}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  if (['pixelperfect', 'soundwave', 'vibemaster'].includes(username.toLowerCase())) {
    return { available: false, suggestions: [`${username}123`, `${username}_`, `the_${username}`] };
  }
  return { available: true, suggestions: [] };
};


export default function EditProfilePage() {
  const { appUser, loading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [isUsernameFieldDisabled, setIsUsernameFieldDisabled] = useState(true);
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0);


  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      bio: '',
    },
    mode: 'onChange',
  });
  
  const watchedUsername = form.watch('username');
  const { isDirty, dirtyFields } = form.formState;
  const hasAvatarChanged = !!avatarFile;
  const hasChanges = isDirty || hasAvatarChanged;

  useEffect(() => {
    if (appUser) {
      form.reset({
        username: appUser.username,
        firstName: appUser.firstName || '',
        lastName: appUser.lastName || '',
        bio: appUser.bio || '',
      });
      setAvatarPreview(appUser.avatarUrl);

      // Username change restriction logic
      if (appUser.usernameLastChanged) {
        // The date from firestore might be a Timestamp object, convert it to Date if so
        const lastChangedDate = typeof appUser.usernameLastChanged.toDate === 'function' 
          ? appUser.usernameLastChanged.toDate() 
          : parseISO(appUser.usernameLastChanged as any);
        
        const daysSinceChange = differenceInDays(new Date(), lastChangedDate);
        const daysRemaining = 7 - daysSinceChange;
        
        if (daysRemaining > 0) {
          setIsUsernameFieldDisabled(true);
          setDaysUntilUsernameChange(Math.ceil(daysRemaining));
        } else {
          setIsUsernameFieldDisabled(false);
        }
      } else {
        // If it's never been changed, they can change it.
        setIsUsernameFieldDisabled(false);
      }
    }
  }, [appUser, form]);

  // Debounced username check
  useEffect(() => {
    if (!appUser || watchedUsername === appUser.username) {
        setUsernameStatus('idle');
        return;
    }

    const handler = setTimeout(async () => {
      if (watchedUsername && watchedUsername.length >= 3) {
        setUsernameStatus('checking');
        const { available, suggestions } = await checkUsernameAvailability(watchedUsername);
        setUsernameStatus(available ? 'available' : 'taken');
        setUsernameSuggestions(suggestions);
      } else {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [watchedUsername, appUser]);


  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!appUser) return;
    
    if (!hasChanges) {
      toast({
        title: 'No changes',
        description: "You haven't made any changes to your profile.",
      });
      return;
    }

    if (usernameStatus === 'taken') {
        toast({
            title: 'Username is taken',
            description: 'Please choose another username.',
            variant: 'destructive',
        });
        return;
    }

    setIsSaving(true);
    let updateError: any = null;

    try {
        const updateData: any = {};
        
        if (isDirty) {
            if (dirtyFields.firstName) updateData.firstName = values.firstName;
            if (dirtyFields.lastName) updateData.lastName = values.lastName;
            if (dirtyFields.bio) updateData.bio = values.bio;
            if (dirtyFields.username) {
                updateData.username = values.username;
                updateData.usernameLastChanged = serverTimestamp();
            }
        }

        if (hasAvatarChanged && avatarFile) {
            const filePath = `avatars/${appUser.uid}/${Date.now()}_${avatarFile.name}`;
            updateData.avatarUrl = await uploadFile(avatarFile, filePath);
        }

        if (Object.keys(updateData).length > 0) {
            const { success, error } = await updateUserProfile(appUser.uid, updateData);
            if (!success) {
                updateError = error;
            }
        }

        if (updateError) {
          throw updateError;
        }

        toast({
            title: 'Profile Updated',
            description: 'Your changes have been saved.',
        });
        router.push('/profile');
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({
            title: 'Update Failed',
            description: 'Could not save your profile. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading || !appUser) {
    return (
      <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8 space-y-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Edit Profile</h1>
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

  const renderUsernameFeedback = () => {
    if (isUsernameFieldDisabled) {
        return <FormDescription>You can change your username again in {daysUntilUsernameChange} day{daysUntilUsernameChange > 1 ? 's' : ''}.</FormDescription>
    }
    switch (usernameStatus) {
      case 'checking':
        return <FormDescription>Checking...</FormDescription>;
      case 'available':
        return <p className="text-sm font-medium text-green-500">Username is available!</p>;
      case 'taken':
        return (
          <div>
            <FormMessage>Username is already taken.</FormMessage>
            {usernameSuggestions.length > 0 && (
              <FormDescription>
                Suggestions: {usernameSuggestions.join(', ')}
              </FormDescription>
            )}
          </div>
        );
      case 'idle':
      default:
        return <FormDescription>Your unique username on Phriendzy.</FormDescription>;
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">Edit Profile</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex items-center gap-6">
            <UserAvatar user={{ ...appUser, avatarUrl: avatarPreview || appUser.avatarUrl }} className="w-20 h-20" />
            <div>
              <h2 className="text-xl font-semibold">{appUser.username}</h2>
              <Button type="button" variant="link" className="p-0 h-auto text-primary" onClick={() => fileInputRef.current?.click()}>
                Change profile photo
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
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
                  <Input {...field} disabled={isUsernameFieldDisabled} />
                </FormControl>
                {renderUsernameFeedback()}
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

          <Button type="submit" loading={isSaving} disabled={!hasChanges || isSaving}>Save Changes</Button>
        </form>
      </Form>
    </div>
  );
}
