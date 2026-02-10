/**
 * OrgLayout — Layout wrapper for the Seeker Organization portal.
 * Mirrors AdminLayout pattern: SidebarProvider + OrgSidebar + SidebarInset + OrgHeader.
 */

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OrgSidebar } from './OrgSidebar';
import { OrgHeader } from './OrgHeader';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';
import React from 'react';

export interface OrgBreadcrumbItem {
  label: string;
  href?: string;
}

interface OrgLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: OrgBreadcrumbItem[];
}

export function OrgLayout({ children, title, description, breadcrumbs }: OrgLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <OrgSidebar />
          <SidebarInset className="flex flex-col">
            <OrgHeader />
            <main className="flex-1 overflow-auto p-6">
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumb className="mb-4">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/org/dashboard">Organization</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((item, index) => (
                      <React.Fragment key={index}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {item.href ? (
                            <BreadcrumbLink asChild>
                              <Link to={item.href}>{item.label}</Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}

              {(title || description) && (
                <div className="mb-6">
                  {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
                  {description && <p className="text-muted-foreground mt-1">{description}</p>}
                </div>
              )}

              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
