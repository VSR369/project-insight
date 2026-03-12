/**
 * OrgKnowledgeCentrePage — Knowledge centre with 6 topic cards
 * Route: /org/knowledge-centre
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, UserCog, Zap, CheckCircle2, Network, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

const topics = [
  {
    icon: ShieldCheck,
    title: 'Role Management Guide',
    description: 'Learn how to assign, manage, and monitor core and challenge roles for your organisation.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: UserCog,
    title: 'Delegated Admin Setup',
    description: 'Step-by-step guide for creating delegated admins with domain scoping and activation links.',
    color: 'text-violet-600 bg-violet-500/10',
  },
  {
    icon: Zap,
    title: 'MSME Quick Assign Walkthrough',
    description: 'How to use the MSME Quick Assign feature to bulk-fill roles for micro and small organisations.',
    color: 'text-amber-600 bg-amber-500/10',
  },
  {
    icon: CheckCircle2,
    title: 'Role Readiness FAQ',
    description: 'Frequently asked questions about role readiness, blocking rules, and challenge submission gates.',
    color: 'text-emerald-600 bg-emerald-500/10',
  },
  {
    icon: Network,
    title: 'Platform Admin Hierarchy',
    description: 'Understanding the hierarchy: Platform Admin → Primary SO Admin → Delegated Admin.',
    color: 'text-blue-600 bg-blue-500/10',
  },
  {
    icon: Globe,
    title: 'Domain Scope & Taxonomy',
    description: 'How the 4-level taxonomy (Industry → Proficiency → Sub-domain → Speciality) governs admin scope.',
    color: 'text-rose-600 bg-rose-500/10',
  },
];

export default function OrgKnowledgeCentrePage() {
  const navigate = useNavigate();

  return (
    <FeatureErrorBoundary featureName="OrgKnowledgeCentrePage">
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Centre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access help articles, guides, and resources for managing your organisation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <Card key={topic.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6 space-y-3">
                <div className={`p-2.5 rounded-lg w-fit ${topic.color}`}>
                  <topic.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{topic.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}
