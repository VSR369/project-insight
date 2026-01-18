import { ReviewerLayout } from '@/components/reviewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReviewerDashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Upcoming Interviews',
      value: '3',
      description: 'Scheduled this week',
      icon: Calendar,
      color: 'text-blue-500',
    },
    {
      title: 'Pending Reviews',
      value: '5',
      description: 'Awaiting your feedback',
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      title: 'Completed',
      value: '12',
      description: 'This month',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Candidates',
      value: '8',
      description: 'In your queue',
      icon: Users,
      color: 'text-purple-500',
    },
  ];

  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
          <p className="text-muted-foreground">
            Here's an overview of your reviewer activity.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>Your next scheduled interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">John Smith</p>
                    <p className="text-sm text-muted-foreground">Senior Engineer • Manufacturing</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Tomorrow</p>
                    <p className="text-xs text-muted-foreground">10:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Jane Doe</p>
                    <p className="text-sm text-muted-foreground">Lead Consultant • Auto Components</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Wed, Jan 22</p>
                    <p className="text-xs text-muted-foreground">2:00 PM</p>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/reviewer/interviews')}
              >
                View All Interviews
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reviewer/availability')}
              >
                <Clock className="mr-2 h-4 w-4" />
                Manage Availability
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reviewer/candidates')}
              >
                <Users className="mr-2 h-4 w-4" />
                View Candidate Queue
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/reviewer/settings')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Update Preferences
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ReviewerLayout>
  );
}
