import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, ListTodo } from 'lucide-react';
import { MyAssignmentsTab } from '@/components/admin/verifications/MyAssignmentsTab';
import { OpenQueueTab } from '@/components/admin/verifications/OpenQueueTab';

/**
 * SCR-03-01 & SCR-03-02: Verification Dashboard
 * Two-tab layout: My Assignments | Open Queue
 */
export default function VerificationDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'mine';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Manage organization verifications and open queue entries.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="mine" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            My Assignments
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListTodo className="h-4 w-4" />
            Open Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <MyAssignmentsTab />
        </TabsContent>

        <TabsContent value="queue">
          <OpenQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
