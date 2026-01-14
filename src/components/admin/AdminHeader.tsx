import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Map paths to readable names
const pathNames: Record<string, string> = {
  'admin': 'Admin',
  'master-data': 'Master Data',
  'countries': 'Countries',
  'industry-segments': 'Industry Segments',
  'organization-types': 'Organization Types',
  'participation-modes': 'Participation Modes',
  'expertise-levels': 'Expertise Levels',
  'academic-taxonomy': 'Academic Taxonomy',
  'proficiency-taxonomy': 'Proficiency Taxonomy',
  'questions': 'Question Bank',
  'settings': 'Settings',
};

export function AdminHeader() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {pathSegments.map((segment, index) => {
            const path = '/' + pathSegments.slice(0, index + 1).join('/');
            const isLast = index === pathSegments.length - 1;
            const name = pathNames[segment] || segment;

            return (
              <span key={path} className="contents">
                <BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbLink href={path}>{name}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{name}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
