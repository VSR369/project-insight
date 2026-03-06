import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import { RegistrationLayout } from "@/components/layouts/RegistrationLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { EnrollmentProvider } from "@/contexts/EnrollmentContext";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { TierGuard } from "@/components/admin/TierGuard";
import { ReviewerGuard } from "@/components/auth/ReviewerGuard";
import { SeekerGuard } from "@/components/auth/SeekerGuard";
import { EnrollmentRequiredGuard } from "@/components/auth/EnrollmentRequiredGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RoleBasedRedirect } from "@/components/routing/RoleBasedRedirect";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// ROUTE LOADING FALLBACK
// Shown while lazy-loaded route components are being fetched
// ============================================================================
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="space-y-4 text-center">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-32 mx-auto" />
      <p className="text-sm text-muted-foreground mt-4">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// EAGER IMPORTS - Core pages loaded immediately for best UX
// (Auth, Dashboard, Enrollment, Pulse - frequently accessed)
// ============================================================================

// Auth Pages (instant load required)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import InviteAccept from "@/pages/InviteAccept";

// Main Pages (instant load required)
import Dashboard from "@/pages/Dashboard";
import Welcome from "@/pages/Welcome";
import NotFound from "@/pages/NotFound";

// Enrollment Wizard Pages (critical path - instant load)
import {
  EnrollRegistration,
  EnrollParticipationMode,
  EnrollOrganization,
  EnrollExpertiseSelection,
  EnrollProofPoints,
  EnrollAssessment,
  TakeAssessment,
  AssessmentResults,
  PostEnrollmentWelcome,
  AddProofPoint,
  EditProofPoint,
  OrganizationPending,
  OrganizationDeclined,
  InterviewScheduling,
  PanelDiscussion,
  Certification,
} from "@/pages/enroll";

// Manager Portal (public pages - instant load)
import ManagerPortal from "@/pages/public/ManagerPortal";
import ManagerApprovalDashboard from "@/pages/public/ManagerApprovalDashboard";

// Placeholder Pages (instant load)
import { 
  ProfilePage, 
  InvitationsPage as UserInvitationsPage, 
  AssessmentPage, 
  KnowledgeCentrePage, 
  SettingsPage 
} from "@/pages/PlaceholderPages";

// Pulse Pages (lazy loaded - reduces main bundle significantly)
const PulseFeedPage = lazy(() => import("@/pages/pulse/PulseFeedPage"));
const PulseSparksPage = lazy(() => import("@/pages/pulse/PulseSparksPage"));
const PulseCreatePage = lazy(() => import("@/pages/pulse/PulseCreatePage"));
const PulseRanksPage = lazy(() => import("@/pages/pulse/PulseRanksPage"));
const PulseProfilePage = lazy(() => import("@/pages/pulse/PulseProfilePage"));
const PulseContentDetailPage = lazy(() => import("@/pages/pulse/PulseContentDetailPage"));
const PulsePublicProfilePage = lazy(() => import("@/pages/pulse/PulsePublicProfilePage"));
const PulseCardsPage = lazy(() => import("@/pages/pulse/PulseCardsPage"));
const PulseCardDetailPage = lazy(() => import("@/pages/pulse/PulseCardDetailPage"));
const PulseModerationPage = lazy(() => import("@/pages/pulse/PulseModerationPage"));
const PulseStandupPage = lazy(() => import("@/pages/pulse/PulseStandupPage"));
const PulseReelsPage = lazy(() => import("@/pages/pulse/PulseReelsPage"));
const PulsePodcastsPage = lazy(() => import("@/pages/pulse/PulsePodcastsPage"));
const PulseArticlesPage = lazy(() => import("@/pages/pulse/PulseArticlesPage"));
const PulseGalleryPage = lazy(() => import("@/pages/pulse/PulseGalleryPage"));

// ============================================================================
// LAZY IMPORTS - Admin & Reviewer pages (loaded on demand)
// These pages are accessed less frequently, reducing initial bundle size
// ============================================================================

// Admin Pages (lazy loaded)
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const CountriesPage = lazy(() => import("@/pages/admin/countries").then(m => ({ default: m.CountriesPage })));
const IndustrySegmentsPage = lazy(() => import("@/pages/admin/industry-segments").then(m => ({ default: m.IndustrySegmentsPage })));
const OrganizationTypesPage = lazy(() => import("@/pages/admin/organization-types").then(m => ({ default: m.OrganizationTypesPage })));
const ParticipationModesPage = lazy(() => import("@/pages/admin/participation-modes").then(m => ({ default: m.ParticipationModesPage })));
const ExpertiseLevelsPage = lazy(() => import("@/pages/admin/expertise-levels").then(m => ({ default: m.ExpertiseLevelsPage })));
const AcademicTaxonomyPage = lazy(() => import("@/pages/admin/academic-taxonomy").then(m => ({ default: m.AcademicTaxonomyPage })));
const ProficiencyTaxonomyPage = lazy(() => import("@/pages/admin/proficiency-taxonomy").then(m => ({ default: m.ProficiencyTaxonomyPage })));
const QuestionBankPage = lazy(() => import("@/pages/admin/question-bank").then(m => ({ default: m.QuestionBankPage })));
const CapabilityTagsPage = lazy(() => import("@/pages/admin/capability-tags").then(m => ({ default: m.CapabilityTagsPage })));
const LevelSpecialityMapPage = lazy(() => import("@/pages/admin/level-speciality-map").then(m => ({ default: m.LevelSpecialityMapPage })));
const InvitationsPage = lazy(() => import("@/pages/admin/invitations").then(m => ({ default: m.InvitationsPage })));
const PanelReviewerInvitationsPage = lazy(() => import("@/pages/admin/invitations").then(m => ({ default: m.PanelReviewerInvitationsPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin/MasterDataPlaceholder").then(m => ({ default: m.AdminSettingsPage })));
const SmokeTestPage = lazy(() => import("@/pages/admin/SmokeTestPage"));
const InterviewRequirementsPage = lazy(() => import("@/pages/admin/interview-requirements").then(m => ({ default: m.InterviewRequirementsPage })));
const ReviewerApprovalsPage = lazy(() => import("@/pages/admin/reviewer-approvals").then(m => ({ default: m.ReviewerApprovalsPage })));
const ReviewerAvailabilityPage = lazy(() => import("@/pages/admin/reviewer-availability").then(m => ({ default: m.ReviewerAvailabilityPage })));
const InterviewKitPage = lazy(() => import("@/pages/admin/interview-kit").then(m => ({ default: m.InterviewKitPage })));
const InterviewKitQuestionsPage = lazy(() => import("@/pages/admin/interview-kit").then(m => ({ default: m.InterviewKitQuestionsPage })));
const PulseSocialTestPage = lazy(() => import("@/pages/admin/PulseSocialTestPage"));
const RegressionTestKitPage = lazy(() => import("@/pages/admin/RegressionTestKitPage"));

// Seeker Config Admin Pages (lazy loaded)
const DepartmentsPage = lazy(() => import("@/pages/admin/departments").then(m => ({ default: m.DepartmentsPage })));
const FunctionalAreasPage = lazy(() => import("@/pages/admin/functional-areas/FunctionalAreasPage"));
const SubscriptionTiersPage = lazy(() => import("@/pages/admin/subscription-tiers").then(m => ({ default: m.SubscriptionTiersPage })));
const EngagementModelsPage = lazy(() => import("@/pages/admin/engagement-models").then(m => ({ default: m.EngagementModelsPage })));
const ChallengeComplexityPage = lazy(() => import("@/pages/admin/challenge-complexity").then(m => ({ default: m.ChallengeComplexityPage })));
const ChallengeStatusesPage = lazy(() => import("@/pages/admin/challenge-statuses").then(m => ({ default: m.ChallengeStatusesPage })));
const ExportControlPage = lazy(() => import("@/pages/admin/export-control").then(m => ({ default: m.ExportControlPage })));
const DataResidencyPage = lazy(() => import("@/pages/admin/data-residency").then(m => ({ default: m.DataResidencyPage })));
const BlockedDomainsPage = lazy(() => import("@/pages/admin/blocked-domains").then(m => ({ default: m.BlockedDomainsPage })));
const PlatformTermsPage = lazy(() => import("@/pages/admin/platform-terms").then(m => ({ default: m.PlatformTermsPage })));
const MembershipTiersPage = lazy(() => import("@/pages/admin/membership-tiers").then(m => ({ default: m.MembershipTiersPage })));
const BaseFeesPage = lazy(() => import("@/pages/admin/base-fees").then(m => ({ default: m.BaseFeesPage })));
const ShadowPricingPage = lazy(() => import("@/pages/admin/shadow-pricing").then(m => ({ default: m.ShadowPricingPage })));
const PricingOverviewPage = lazy(() => import("@/pages/admin/pricing-overview").then(m => ({ default: m.PricingOverviewPage })));
const PlatformFeesPage = lazy(() => import("@/pages/admin/platform-fees").then(m => ({ default: m.PlatformFeesPage })));
const TaxFormatsPage = lazy(() => import("@/pages/admin/tax-formats").then(m => ({ default: m.TaxFormatsPage })));
const SubsidizedPricingPage = lazy(() => import("@/pages/admin/subsidized-pricing").then(m => ({ default: m.SubsidizedPricingPage })));
const PostalFormatsPage = lazy(() => import("@/pages/admin/postal-formats").then(m => ({ default: m.PostalFormatsPage })));
const BillingCyclesPage = lazy(() => import("@/pages/admin/billing-cycles").then(m => ({ default: m.BillingCyclesPage })));
const PaymentMethodsPage = lazy(() => import("@/pages/admin/payment-methods").then(m => ({ default: m.PaymentMethodsPage })));

// Platform Admin Management Pages (MOD-01, lazy loaded)
const PlatformAdminListPage = lazy(() => import("@/pages/admin/platform-admins/PlatformAdminListPage"));
const CreatePlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/CreatePlatformAdminPage"));
const EditPlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/EditPlatformAdminPage"));
const ViewPlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/ViewPlatformAdminPage"));
const MyProfilePage = lazy(() => import("@/pages/admin/platform-admins/MyProfilePage"));
const AvailabilitySettingsPage = lazy(() => import("@/pages/admin/platform-admins/AvailabilitySettingsPage"));

// Tools Pages (lazy loaded)
const RegressionTestPage = lazy(() => import("@/pages/provider/RegressionTestPage"));
const LifecycleRulesPage = lazy(() => import("@/pages/provider/LifecycleRulesPage"));

// Reviewer Pages (lazy loaded)
const ReviewerDashboard = lazy(() => import("@/pages/reviewer/ReviewerDashboard"));
const InvitationResponsePage = lazy(() => import("@/pages/reviewer/InvitationResponsePage"));
const ReviewerAvailability = lazy(() => import("@/pages/reviewer/ReviewerAvailability"));
const ReviewerInterviews = lazy(() => import("@/pages/reviewer/ReviewerInterviews"));
const ReviewerCandidates = lazy(() => import("@/pages/reviewer/ReviewerCandidates"));
const ReviewerSettings = lazy(() => import("@/pages/reviewer/ReviewerSettings"));
const CandidateDetailPage = lazy(() => import("@/pages/reviewer/CandidateDetailPage"));
const ReviewerPendingApproval = lazy(() => import("@/pages/reviewer/ReviewerPendingApproval"));

// Seeker Registration Pages (lazy loaded - public, pre-auth)
const OrganizationIdentityPage = lazy(() => import("@/pages/registration/OrganizationIdentityPage"));
const PrimaryContactPage = lazy(() => import("@/pages/registration/PrimaryContactPage"));
const CompliancePage = lazy(() => import("@/pages/registration/CompliancePage"));
const PlanSelectionPage = lazy(() => import("@/pages/registration/PlanSelectionPage"));
const BillingPage = lazy(() => import("@/pages/registration/BillingPage"));
const RegistrationPreviewPage = lazy(() => import("@/pages/registration/RegistrationPreviewPage"));

// Seeker Organization Pages (lazy loaded - post-auth)
const OrgDashboardPage = lazy(() => import("@/pages/org/OrgDashboardPage"));
const ChallengeListPage = lazy(() => import("@/pages/org/ChallengeListPage"));
const OrgSettingsPage = lazy(() => import("@/pages/org/OrgSettingsPage"));
const MembershipPage = lazy(() => import("@/pages/org/MembershipPage"));
const ParentDashboardPage = lazy(() => import("@/pages/org/ParentDashboardPage"));
const SaasAgreementPage = lazy(() => import("@/pages/admin/SaasAgreementPage"));
const SeekerOrgApprovalsPage = lazy(() => import("@/pages/admin/seeker-org-approvals/SeekerOrgApprovalsPage"));
const SeekerOrgReviewPage = lazy(() => import("@/pages/admin/seeker-org-approvals/SeekerOrgReviewPage"));
const TeamPage = lazy(() => import("@/pages/org/TeamPage"));
const ChallengeCreatePage = lazy(() => import("@/pages/org/ChallengeCreatePage"));
const OrgBillingPage = lazy(() => import("@/pages/org/OrgBillingPage"));
const OnboardingCompletePage = lazy(() => import("@/pages/registration/OnboardingCompletePage"));

import { queryClient } from "@/lib/queryClient";

// Export queryClient for shared access (auth state changes, portal switching)
export { queryClient };

// ============================================================================
// HELPER: Wrap lazy component with Suspense
// ============================================================================
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RouteLoadingFallback />}>
    {children}
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <EnrollmentProvider>
            <ErrorBoundary componentName="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/manager-portal" element={<ManagerPortal />} />
            <Route path="/manager-portal/review" element={<ManagerApprovalDashboard />} />

            {/* Seeker Registration Wizard (public, pre-auth) */}
            <Route element={<RegistrationLayout />}>
              <Route path="/registration/organization-identity" element={
                <LazyRoute><OrganizationIdentityPage /></LazyRoute>
              } />
              <Route path="/registration/primary-contact" element={
                <LazyRoute><PrimaryContactPage /></LazyRoute>
              } />
              <Route path="/registration/compliance" element={
                <LazyRoute><CompliancePage /></LazyRoute>
              } />
              <Route path="/registration/plan-selection" element={
                <LazyRoute><PlanSelectionPage /></LazyRoute>
              } />
              <Route path="/registration/billing" element={
                <LazyRoute><BillingPage /></LazyRoute>
              } />
              <Route path="/registration/preview" element={
                <LazyRoute><RegistrationPreviewPage /></LazyRoute>
              } />
            </Route>
            
            {/* Reviewer Pending Approval (accessible without role) */}
            <Route 
              path="/reviewer/pending-approval" 
              element={
                <AuthGuard>
                  <LazyRoute><ReviewerPendingApproval /></LazyRoute>
                </AuthGuard>
              } 
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <Dashboard />
                </AuthGuard>
              }
            />
            <Route
              path="/welcome"
              element={
                <AuthGuard>
                  <Welcome />
                </AuthGuard>
              }
            />

            {/* Enrollment Wizard (9-step flow - no sidebar) */}
            <Route
              path="/enroll/registration"
              element={
                <AuthGuard>
                  <EnrollRegistration />
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/welcome"
              element={
                <AuthGuard>
                  <PostEnrollmentWelcome />
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/participation-mode"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EnrollParticipationMode />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EnrollOrganization />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/expertise"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EnrollExpertiseSelection />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EnrollProofPoints />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points/add"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <AddProofPoint />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points/edit/:id"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EditProofPoint />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization-pending"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <OrganizationPending />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization-declined"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <OrganizationDeclined />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <EnrollAssessment />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment/take"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <TakeAssessment />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment/results"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <AssessmentResults />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/interview-slot"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <InterviewScheduling />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/panel-discussion"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <PanelDiscussion />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/certification"
              element={
                <AuthGuard>
                  <EnrollmentRequiredGuard>
                    <Certification />
                  </EnrollmentRequiredGuard>
                </AuthGuard>
              }
            />

            {/* Redirects from old profile/build routes to new enroll routes */}
            <Route path="/profile/build/registration" element={<Navigate to="/enroll/registration" replace />} />
            <Route path="/profile/build/choose-mode" element={<Navigate to="/enroll/participation-mode" replace />} />
            <Route path="/profile/build/organization" element={<Navigate to="/enroll/organization" replace />} />
            <Route path="/profile/build/expertise" element={<Navigate to="/enroll/expertise" replace />} />
            <Route path="/profile/build/proficiency" element={<Navigate to="/enroll/expertise" replace />} />
            <Route path="/profile/build/proof-points" element={<Navigate to="/enroll/proof-points" replace />} />

            {/* Other Protected Pages */}
            <Route
              path="/profile"
              element={
                <AuthGuard>
                  <ProfilePage />
                </AuthGuard>
              }
            />
            <Route
              path="/invitations"
              element={
                <AuthGuard>
                  <UserInvitationsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/assessment"
              element={
                <AuthGuard>
                  <AssessmentPage />
                </AuthGuard>
              }
            />
            <Route
              path="/knowledge-centre"
              element={
                <AuthGuard>
                  <KnowledgeCentrePage />
                </AuthGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthGuard>
                  <SettingsPage />
                </AuthGuard>
              }
            />

            {/* Tools Routes (lazy loaded) */}
            <Route
              path="/tools/regression-test"
              element={
                <AuthGuard>
                  <LazyRoute><RegressionTestPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/tools/lifecycle-rules"
              element={
                <AuthGuard>
                  <LazyRoute><LifecycleRulesPage /></LazyRoute>
                </AuthGuard>
              }
            />

            {/* Admin Routes — nested under AdminShell for persistent sidebar */}
            <Route path="/admin" element={<AdminGuard><AdminShell /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="master-data/countries" element={<CountriesPage />} />
              <Route path="master-data/industry-segments" element={<IndustrySegmentsPage />} />
              <Route path="master-data/organization-types" element={<OrganizationTypesPage />} />
              <Route path="master-data/participation-modes" element={<ParticipationModesPage />} />
              <Route path="master-data/expertise-levels" element={<ExpertiseLevelsPage />} />
              <Route path="master-data/academic-taxonomy" element={<AcademicTaxonomyPage />} />
              <Route path="master-data/proficiency-taxonomy" element={<ProficiencyTaxonomyPage />} />
              <Route path="master-data/departments" element={<DepartmentsPage />} />
              <Route path="master-data/functional-areas" element={<FunctionalAreasPage />} />
              <Route path="questions" element={<QuestionBankPage />} />
              <Route path="capability-tags" element={<CapabilityTagsPage />} />
              <Route path="level-speciality-map" element={<LevelSpecialityMapPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="invitations/panel-reviewers" element={<PanelReviewerInvitationsPage />} />
              <Route path="smoke-test" element={<SmokeTestPage />} />
              <Route path="settings" element={<TierGuard requiredTier="senior_admin"><AdminSettingsPage /></TierGuard>} />
              <Route path="interview/kit" element={<InterviewKitPage />} />
              <Route path="interview/kit/questions" element={<InterviewKitQuestionsPage />} />
              <Route path="interview/quorum-requirements" element={<InterviewRequirementsPage />} />
              <Route path="reviewer-approvals" element={<ReviewerApprovalsPage />} />
              <Route path="interview/reviewer-availability" element={<ReviewerAvailabilityPage />} />
              <Route path="pulse-social-test" element={<PulseSocialTestPage />} />
              <Route path="regression-test-kit" element={<RegressionTestKitPage />} />
              {/* Seeker Config — senior_admin+ */}
              <Route path="seeker-config/pricing-overview" element={<TierGuard requiredTier="senior_admin"><PricingOverviewPage /></TierGuard>} />
              <Route path="seeker-config/subscription-tiers" element={<TierGuard requiredTier="senior_admin"><SubscriptionTiersPage /></TierGuard>} />
              <Route path="seeker-config/engagement-models" element={<TierGuard requiredTier="senior_admin"><EngagementModelsPage /></TierGuard>} />
              <Route path="seeker-config/challenge-complexity" element={<TierGuard requiredTier="senior_admin"><ChallengeComplexityPage /></TierGuard>} />
              <Route path="seeker-config/challenge-statuses" element={<TierGuard requiredTier="senior_admin"><ChallengeStatusesPage /></TierGuard>} />
              {/* Compliance Config — supervisor only */}
              <Route path="seeker-config/export-control" element={<TierGuard requiredTier="supervisor"><ExportControlPage /></TierGuard>} />
              <Route path="seeker-config/data-residency" element={<TierGuard requiredTier="supervisor"><DataResidencyPage /></TierGuard>} />
              <Route path="seeker-config/blocked-domains" element={<TierGuard requiredTier="supervisor"><BlockedDomainsPage /></TierGuard>} />
              <Route path="seeker-config/platform-terms" element={<TierGuard requiredTier="senior_admin"><PlatformTermsPage /></TierGuard>} />
              <Route path="seeker-config/membership-tiers" element={<TierGuard requiredTier="senior_admin"><MembershipTiersPage /></TierGuard>} />
              <Route path="seeker-config/base-fees" element={<TierGuard requiredTier="senior_admin"><BaseFeesPage /></TierGuard>} />
              <Route path="seeker-config/shadow-pricing" element={<TierGuard requiredTier="senior_admin"><ShadowPricingPage /></TierGuard>} />
              <Route path="seeker-config/platform-fees" element={<TierGuard requiredTier="senior_admin"><PlatformFeesPage /></TierGuard>} />
              <Route path="seeker-config/tax-formats" element={<TierGuard requiredTier="senior_admin"><TaxFormatsPage /></TierGuard>} />
              <Route path="seeker-config/subsidized-pricing" element={<TierGuard requiredTier="senior_admin"><SubsidizedPricingPage /></TierGuard>} />
              <Route path="seeker-config/postal-formats" element={<TierGuard requiredTier="senior_admin"><PostalFormatsPage /></TierGuard>} />
              <Route path="seeker-config/billing-cycles" element={<TierGuard requiredTier="senior_admin"><BillingCyclesPage /></TierGuard>} />
              <Route path="seeker-config/payment-methods" element={<TierGuard requiredTier="senior_admin"><PaymentMethodsPage /></TierGuard>} />
              <Route path="saas-agreements" element={<SaasAgreementPage />} />
              <Route path="seeker-org-approvals" element={<SeekerOrgApprovalsPage />} />
              <Route path="seeker-org-approvals/:orgId" element={<SeekerOrgReviewPage />} />
              {/* MOD-01: Platform Admin Management — senior_admin+ */}
              <Route path="platform-admins" element={<TierGuard requiredTier="senior_admin"><PlatformAdminListPage /></TierGuard>} />
              <Route path="platform-admins/new" element={<TierGuard requiredTier="senior_admin"><CreatePlatformAdminPage /></TierGuard>} />
              <Route path="platform-admins/:adminId" element={<TierGuard requiredTier="senior_admin"><ViewPlatformAdminPage /></TierGuard>} />
              <Route path="platform-admins/:adminId/edit" element={<TierGuard requiredTier="supervisor"><EditPlatformAdminPage /></TierGuard>} />
              <Route path="my-profile" element={<MyProfilePage />} />
              <Route path="availability" element={<AvailabilitySettingsPage />} />
            </Route>
            {/* Reviewer Routes (all lazy loaded) */}
            <Route
              path="/reviewer/invitation-response"
              element={
                <AuthGuard>
                  <LazyRoute><InvitationResponsePage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/reviewer/dashboard"
              element={
                <ReviewerGuard>
                  <LazyRoute><ReviewerDashboard /></LazyRoute>
                </ReviewerGuard>
              }
            />
            <Route
              path="/reviewer/availability"
              element={
                <ReviewerGuard>
                  <LazyRoute><ReviewerAvailability /></LazyRoute>
                </ReviewerGuard>
              }
            />
            <Route
              path="/reviewer/interviews"
              element={
                <ReviewerGuard>
                  <LazyRoute><ReviewerInterviews /></LazyRoute>
                </ReviewerGuard>
              }
            />
            <Route
              path="/reviewer/candidates"
              element={
                <ReviewerGuard>
                  <LazyRoute><ReviewerCandidates /></LazyRoute>
                </ReviewerGuard>
              }
            />
            <Route
              path="/reviewer/candidates/:enrollmentId"
              element={
                <ReviewerGuard>
                  <LazyRoute><CandidateDetailPage /></LazyRoute>
                </ReviewerGuard>
              }
            />
            <Route
              path="/reviewer/settings"
              element={
                <ReviewerGuard>
                  <LazyRoute><ReviewerSettings /></LazyRoute>
                </ReviewerGuard>
              }
            />

            {/* Pulse Routes (mobile-first social network) */}
            {/* Backward-compatible redirect (page removed) */}
            <Route path="/pulse/get-started" element={<Navigate to="/welcome" replace />} />
            <Route
              path="/pulse/feed"
              element={
                <AuthGuard>
                  <LazyRoute><PulseFeedPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/sparks"
              element={
                <AuthGuard>
                  <LazyRoute><PulseSparksPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/reels"
              element={
                <AuthGuard>
                  <LazyRoute><PulseReelsPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/podcasts"
              element={
                <AuthGuard>
                  <LazyRoute><PulsePodcastsPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/articles"
              element={
                <AuthGuard>
                  <LazyRoute><PulseArticlesPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/gallery"
              element={
                <AuthGuard>
                  <LazyRoute><PulseGalleryPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/create"
              element={
                <AuthGuard>
                  <LazyRoute><PulseCreatePage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/ranks"
              element={
                <AuthGuard>
                  <LazyRoute><PulseRanksPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/profile"
              element={
                <AuthGuard>
                  <LazyRoute><PulseProfilePage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/profile/:providerId"
              element={
                <AuthGuard>
                  <LazyRoute><PulsePublicProfilePage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/content/:contentId"
              element={
                <AuthGuard>
                  <LazyRoute><PulseContentDetailPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/cards"
              element={
                <AuthGuard>
                  <LazyRoute><PulseCardsPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/cards/:cardId"
              element={
                <AuthGuard>
                  <LazyRoute><PulseCardDetailPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/moderation"
              element={
                <AuthGuard>
                  <LazyRoute><PulseModerationPage /></LazyRoute>
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/standup"
              element={
                <AuthGuard>
                  <LazyRoute><PulseStandupPage /></LazyRoute>
                </AuthGuard>
              }
            />

            {/* Seeker Organization Routes (wrapped in SeekerGuard) */}
            <Route
              path="/org/dashboard"
              element={
                <SeekerGuard>
                  <LazyRoute><OrgDashboardPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/challenges"
              element={
                <SeekerGuard>
                  <LazyRoute><ChallengeListPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/settings"
              element={
                <SeekerGuard>
                  <LazyRoute><OrgSettingsPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/membership"
              element={
                <SeekerGuard>
                  <LazyRoute><MembershipPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/parent-dashboard"
              element={
                <SeekerGuard>
                  <LazyRoute><ParentDashboardPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/team"
              element={
                <SeekerGuard>
                  <LazyRoute><TeamPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/challenges/create"
              element={
                <SeekerGuard>
                  <LazyRoute><ChallengeCreatePage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/org/billing"
              element={
                <SeekerGuard>
                  <LazyRoute><OrgBillingPage /></LazyRoute>
                </SeekerGuard>
              }
            />
            <Route
              path="/registration/complete"
              element={
                <LazyRoute><OnboardingCompletePage /></LazyRoute>
              }
            />
            {/* SaasAgreementPage moved to nested /admin route above */}

            {/* Role-based redirect for root route */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </EnrollmentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
