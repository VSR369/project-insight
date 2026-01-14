import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Award, 
  FileText, 
  Link2, 
  Briefcase,
  GraduationCap,
  Trophy,
  BookOpen,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Sample proof points for demo
const sampleProofPoints = [
  {
    id: '1',
    type: 'project',
    category: 'general',
    title: 'E-commerce Platform Redesign',
    description: 'Led the complete frontend redesign of a major e-commerce platform...',
    linksCount: 2,
    filesCount: 1,
    tagsCount: 3,
  },
  {
    id: '2',
    type: 'certification',
    category: 'specialty_specific',
    title: 'AWS Solutions Architect Professional',
    description: 'Achieved the professional level certification demonstrating...',
    linksCount: 1,
    filesCount: 1,
    tagsCount: 2,
  },
];

const typeIcons: Record<string, typeof Briefcase> = {
  project: Briefcase,
  case_study: FileText,
  certification: GraduationCap,
  award: Trophy,
  publication: BookOpen,
  portfolio: Award,
  testimonial: FileText,
  other: FileText,
};

const typeLabels: Record<string, string> = {
  project: 'Project',
  case_study: 'Case Study',
  certification: 'Certification',
  award: 'Award',
  publication: 'Publication',
  portfolio: 'Portfolio',
  testimonial: 'Testimonial',
  other: 'Other',
};

export default function ProofPoints() {
  const navigate = useNavigate();
  const [proofPoints] = useState(sampleProofPoints);

  const profileStrength = Math.min((proofPoints.length / 5) * 100, 100);
  const minimumMet = proofPoints.length >= 2;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 5 of 5</span>
            <span>•</span>
            <span>Proof Points</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Showcase Your Work
          </h1>
          <p className="text-muted-foreground mt-2">
            Add proof points to demonstrate your expertise. Include projects, certifications, awards, and more.
          </p>
        </div>

        {/* Profile Strength */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Profile Strength</span>
                  <span className="text-sm text-muted-foreground">
                    {proofPoints.length} of 5 recommended
                  </span>
                </div>
                <Progress value={profileStrength} className="h-2" />
              </div>
              <Badge variant={minimumMet ? "default" : "secondary"}>
                {minimumMet ? 'Minimum Met' : 'Add 2+ Proof Points'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Add Button */}
        <div className="flex justify-end mb-4">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Proof Point
          </Button>
        </div>

        {/* Proof Points List */}
        {proofPoints.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No Proof Points Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Start adding your projects, certifications, and achievements to build credibility.
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Proof Point
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {proofPoints.map((proof) => {
              const Icon = typeIcons[proof.type] || FileText;
              
              return (
                <Card key={proof.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium">{proof.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[proof.type]}
                              </Badge>
                              {proof.category === 'specialty_specific' && (
                                <Badge variant="secondary" className="text-xs">
                                  Specialty
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {proof.description}
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          {proof.linksCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              {proof.linksCount} links
                            </span>
                          )}
                          {proof.filesCount > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {proof.filesCount} files
                            </span>
                          )}
                          {proof.tagsCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {proof.tagsCount} skills
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/profile/build/proficiency')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            disabled={!minimumMet}
            className="gap-2 sm:ml-auto"
          >
            Complete Profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {!minimumMet && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Add at least 2 proof points to complete your profile
          </p>
        )}
      </div>
    </AppLayout>
  );
}
