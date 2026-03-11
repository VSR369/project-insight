/**
 * MarketplaceDashboard — SCR-01 Marketplace Management Console
 * KPI cards, management consoles, recent activity
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  Shield,
  UserCheck,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { usePoolMembers } from "@/hooks/queries/usePoolMembers";
import { Skeleton } from "@/components/ui/skeleton";

const MANAGEMENT_CONSOLES = [
  {
    title: "Resource Pool",
    description: "Manage the global SLM resource pool — add, edit, and track availability of pool members.",
    icon: Users,
    path: "/admin/marketplace/resource-pool",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    title: "Solution Requests",
    description: "Review and assign challenge teams to incoming Marketplace solution requests.",
    icon: ClipboardList,
    path: "/admin/marketplace/solution-requests",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    title: "Delegated Admins",
    description: "Create and manage Delegated Seeking Org Admins with scoped authority.",
    icon: UserCheck,
    path: "/admin/marketplace/delegated-admins",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    comingSoon: true,
  },
];

export default function MarketplaceDashboard() {
  const navigate = useNavigate();
  const { data: poolMembers, isLoading: poolLoading } = usePoolMembers();

  const activeCount = poolMembers?.length ?? 0;
  const availableCount = poolMembers?.filter((m) => m.availability_status === "available").length ?? 0;
  const bookedCount = poolMembers?.filter((m) => m.availability_status === "fully_booked").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1">
          Platform Admin &gt; Marketplace
        </nav>
        <h1 className="text-2xl font-bold text-foreground">Marketplace Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage resource pools, challenge assignments, and role configurations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Pool Members"
          value={poolLoading ? null : activeCount}
          subtitle={`${availableCount} available`}
          icon={Users}
          trend="+3 this month"
        />
        <KpiCard
          title="Pending Requests"
          value={0}
          subtitle="0 awaiting assignment"
          icon={ClipboardList}
          trend="No change"
        />
        <KpiCard
          title="Role Readiness"
          value={`—`}
          subtitle="Ready organizations"
          icon={Shield}
          trend="—"
        />
        <KpiCard
          title="Fully Booked"
          value={poolLoading ? null : bookedCount}
          subtitle={`of ${activeCount} total`}
          icon={TrendingUp}
          trend="—"
        />
      </div>

      {/* Management Consoles */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Management Consoles</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MANAGEMENT_CONSOLES.map((console) => (
            <Card
              key={console.title}
              className={`cursor-pointer transition-all hover:shadow-md ${console.comingSoon ? "opacity-60" : ""}`}
              onClick={() => !console.comingSoon && navigate(console.path)}
            >
              <CardHeader className="flex flex-row items-start gap-4 pb-2">
                <div className={`rounded-lg p-2.5 ${console.bgColor}`}>
                  <console.icon className={`h-5 w-5 ${console.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {console.title}
                    {console.comingSoon && (
                      <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {console.description}
                  </CardDescription>
                </div>
                {!console.comingSoon && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Activity timeline will appear here as pool members are added and assignments are made.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number | null;
  subtitle: string;
  icon: React.ElementType;
  trend: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{trend}</p>
      </CardContent>
    </Card>
  );
}
