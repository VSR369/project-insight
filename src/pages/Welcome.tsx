import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Eye, Shield, Zap, ArrowRight, BookOpen, LogOut } from 'lucide-react';

export default function Welcome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.first_name || 'Provider';

  const benefits = [
    {
      icon: Eye,
      title: 'Visibility',
      description: 'Get discovered by seekers looking for your expertise across our growing network.',
    },
    {
      icon: Shield,
      title: 'Credibility',
      description: 'Build trust through verified credentials, proof points, and client testimonials.',
    },
    {
      icon: Zap,
      title: 'Opportunities',
      description: 'Access exclusive engagements matched to your skills and experience level.',
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Welcome to CogniBlend
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Hello, {firstName}! 🎉
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            You've taken the first step. Now let's build a profile that showcases your expertise and opens doors to exciting opportunities.
          </p>
        </div>
      </div>

      {/* Why Your Profile Matters */}
      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Why Your Profile Matters</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="text-center border-border/50">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-xl mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 sm:p-8 text-center space-y-6">
              <h3 className="text-xl font-semibold">Ready to Stand Out?</h3>
              <p className="text-muted-foreground">
                Complete your profile in just a few steps and start connecting with opportunities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/enroll/registration')}
                  className="gap-2"
                >
                  Let's Build Your Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/knowledge-centre')}
                  className="gap-2 text-muted-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  Knowledge Centre
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-muted-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
