'use client';

import {
  ChevronRight,
  KeyRound,
  Bell,
  Shield,
  UserX,
  Lock,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="font-headline text-3xl font-bold tracking-tight mb-8">
        Settings
      </h1>

      <div className="space-y-8">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account information.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <KeyRound className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Change Password</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors text-destructive cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="font-medium">Deactivate Account</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Enhance your account's security.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Two-Factor Authentication</span>
              </div>
              <Button size="sm">Enable</Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Control who can see your content.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Private Account</p>
                  <p className="text-sm text-muted-foreground">
                    Only approved followers can see your posts.
                  </p>
                </div>
              </div>
              <Switch id="private-account" />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <UserX className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Blocked Accounts</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <p className="font-medium">Push Notifications</p>
              </div>
              <Switch id="push-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="font-medium ml-9">
                  Likes, Comments, and Mentions
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}