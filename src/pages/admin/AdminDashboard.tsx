import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Building2, 
  Users, 
  Briefcase, 
  Award, 
  Network,
  FileQuestion,
  Link2,
  Mail,
  ArrowRight,
  Handshake,
  UserCheck,
  TestTube2,
  ShieldCheck,
  Settings,
  User,
  Landmark,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePendingReviewerCount } from '@/hooks/queries/usePanelReviewers';
import { useAdminTier, type AdminTier } from '@/hooks/useAdminTier';

const TIER_LABELS: Record<AdminTier, string> = {
  supervisor: 'Supervisor',
  senior_admin: 'Senior Admin',
  admin: 'Admin',
};

interface DashboardSection {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  hasBadge?: boolean;
  /** Permission key(s) required — OR logic: any match grants visibility */
  permissionKey: string | string[];
}

const sections: DashboardSection[] = [
  // === Reference Data (master_data.view / taxonomy.view) ===
  {
    title: 'Countries',
    description: 'Manage country codes and phone codes',
    icon: Globe,
    path: '/admin/master-data/countries',
    color: 'text-blue-500',
    permissionKey: 'master_data.view',
  },
  {
    title: 'Industry Segments',
    description: 'Define industry sectors for providers',
    icon: Briefcase,
    path: '/admin/master-data/industry-segments',
    color: 'text-green-500',
    permissionKey: 'master_data.view',
  },
  {
    title: 'Organization Types',
    description: 'Configure organization categories',
    icon: Building2,
    path: '/admin/master-data/organization-types',
    color: 'text-purple-500',
    permissionKey: 'master_data.view',
  },
  {
    title: 'Participation Modes',
    description: 'Set up how providers can participate',
    icon: Users,
    path: '/admin/master-data/participation-modes',
    color: 'text-orange-500',
    permissionKey: 'master_data.view',
  },
  {
    title: 'Expertise Levels',
    description: 'Define experience tiers',
    icon: Award,
    path: '/admin/master-data/expertise-levels',
    color: 'text-yellow-500',
    permissionKey: 'master_data.view',
  },
  {
    title: 'Proficiency Taxonomy',
    description: 'Areas, sub-domains, and specialities',
    icon: Network,
    path: '/admin/master-data/proficiency-taxonomy',
    color: 'text-cyan-500',
    permissionKey: 'taxonomy.view',
  },
  {
    title: 'Level-Speciality Mapping',
    description: 'Link expertise levels to specialities',
    icon: Link2,
    path: '/admin/level-speciality-map',
    color: 'text-indigo-500',
    permissionKey: 'master_data.view',
  },

  // === Content & Invitations ===
  {
    title: 'Question Bank',
    description: 'Manage assessment questions',
    icon: FileQuestion,
    path: '/admin/questions',
    color: 'text-red-500',
    permissionKey: 'content.view_questions',
  },
  {
    title: 'Invitations',
    description: 'Manage provider invitations',
    icon: Mail,
    path: '/admin/invitations',
    color: 'text-teal-500',
    permissionKey: 'invitations.view',
  },

  // === Operations ===
  {
    title: 'Reviewer Approvals',
    description: 'Approve or reject reviewer applications',
    icon: UserCheck,
    path: '/admin/reviewer-approvals',
    color: 'text-amber-500',
    hasBadge: true,
    permissionKey: 'interview.view',
  },

  // === My Workspace (always visible) ===
  {
    title: 'My Profile',
    description: 'View and manage your admin profile',
    icon: User,
    path: '/admin/my-profile',
    color: 'text-slate-500',
    permissionKey: 'admin_management.view_my_profile',
  },

  // === Dev Tools ===
  {
    title: 'Regression Test Kit',
    description: 'Comprehensive system regression tests',
    icon: TestTube2,
    path: '/admin/regression-test-kit',
    color: 'text-emerald-500',
    permissionKey: 'supervisor.configure_system',
  },

  // === Senior Admin + Supervisor ===
  {
    title: 'Platform Admins',
    description: 'Manage platform admin team members',
    icon: ShieldCheck,
    path: '/admin/platform-admins',
    color: 'text-rose-500',
    permissionKey: 'admin_management.view_all_admins',
  },
  {
    title: 'Seeker Config',
    description: 'Subscription tiers, pricing & models',
    icon: Landmark,
    path: '/admin/seeker-config/pricing-overview',
    color: 'text-violet-500',
    permissionKey: 'seeker_config.view',
  },
  {
    title: 'Enterprise Agreements',
    description: 'Manage parent-child enterprise agreements',
    icon: Handshake,
    path: '/admin/saas-agreements',
    color: 'text-violet-500',
    permissionKey: 'org_approvals.manage_agreements',
  },
  {
    title: 'Settings',
    description: 'Platform admin settings',
    icon: Settings,
    path: '/admin/settings',
    color: 'text-gray-500',
    permissionKey: 'admin_management.view_settings',
  },

  // === Supervisor only ===
  {
    title: 'Compliance Config',
    description: 'Export control, data residency, blocked domains',
    icon: Lock,
    path: '/admin/seeker-config/export-control',
    color: 'text-red-600',
    permissionKey: 'seeker_config.manage_compliance',
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: pendingCount } = usePendingReviewerCount();
  const { tier, hasPermission, isLoading: tierLoading } = useAdminTier();

  const visibleSections = sections.filter((s) => {
    const keys = Array.isArray(s.permissionKey) ? s.permissionKey : [s.permissionKey];
    return keys.some((key) => hasPermission(key));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage platform master data and configuration
          </p>
        </div>
        {!tierLoading && tier && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            {TIER_LABELS[tier]}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {visibleSections.map((section) => (
          <Card 
            key={section.path}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => navigate(section.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {section.title}
                {section.hasBadge && pendingCount && pendingCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                    {pendingCount}
                  </Badge>
                )}
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
  );
}
