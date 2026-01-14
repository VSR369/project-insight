import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Globe, 
  Building2, 
  Users, 
  Briefcase, 
  Award, 
  GraduationCap, 
  Network,
  FileQuestion,
  Link2,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const sections = [
  {
    title: 'Countries',
    description: 'Manage country codes and phone codes',
    icon: Globe,
    path: '/admin/master-data/countries',
    color: 'text-blue-500',
  },
  {
    title: 'Industry Segments',
    description: 'Define industry sectors for providers',
    icon: Briefcase,
    path: '/admin/master-data/industry-segments',
    color: 'text-green-500',
  },
  {
    title: 'Organization Types',
    description: 'Configure organization categories',
    icon: Building2,
    path: '/admin/master-data/organization-types',
    color: 'text-purple-500',
  },
  {
    title: 'Participation Modes',
    description: 'Set up how providers can participate',
    icon: Users,
    path: '/admin/master-data/participation-modes',
    color: 'text-orange-500',
  },
  {
    title: 'Expertise Levels',
    description: 'Define experience tiers',
    icon: Award,
    path: '/admin/master-data/expertise-levels',
    color: 'text-yellow-500',
  },
  {
    title: 'Academic Taxonomy',
    description: 'Disciplines, streams, and subjects',
    icon: GraduationCap,
    path: '/admin/master-data/academic-taxonomy',
    color: 'text-pink-500',
  },
  {
    title: 'Proficiency Taxonomy',
    description: 'Areas, sub-domains, and specialities',
    icon: Network,
    path: '/admin/master-data/proficiency-taxonomy',
    color: 'text-cyan-500',
  },
  {
    title: 'Level-Speciality Mapping',
    description: 'Link expertise levels to specialities',
    icon: Link2,
    path: '/admin/level-speciality-map',
    color: 'text-indigo-500',
  },
  {
    title: 'Question Bank',
    description: 'Manage assessment questions',
    icon: FileQuestion,
    path: '/admin/questions',
    color: 'text-red-500',
  },
  {
    title: 'Invitations',
    description: 'Manage provider invitations',
    icon: Mail,
    path: '/admin/invitations',
    color: 'text-teal-500',
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage platform master data and configuration
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sections.map((section) => (
            <Card 
              key={section.path}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate(section.path)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {section.title}
                </CardTitle>
                <section.icon className={`h-5 w-5 ${section.color}`} />
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {section.description}
                </CardDescription>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  Manage <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
