import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, CheckCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const firstName = user?.user_metadata?.first_name || 'Provider';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">CogniBlend</h1>
            <p className="text-sm text-muted-foreground">Solution Provider Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{firstName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {firstName}! 👋</h2>
          <p className="text-muted-foreground mt-1">Here's your profile overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Registered</div>
              <p className="text-xs text-muted-foreground">Complete your profile</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Completion</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">10%</div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proof Points</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Add your evidence</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Actions required</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Complete these steps to build your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">1</div>
              <div className="flex-1">
                <h4 className="font-medium">Choose Participation Mode</h4>
                <p className="text-sm text-muted-foreground">Select how you want to engage with clients</p>
              </div>
              <Button size="sm">Start</Button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg opacity-60">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">2</div>
              <div className="flex-1">
                <h4 className="font-medium">Select Expertise Level</h4>
                <p className="text-sm text-muted-foreground">Define your experience level</p>
              </div>
              <Button size="sm" disabled>Locked</Button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg opacity-60">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">3</div>
              <div className="flex-1">
                <h4 className="font-medium">Add Proof Points</h4>
                <p className="text-sm text-muted-foreground">Showcase your work and achievements</p>
              </div>
              <Button size="sm" disabled>Locked</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
