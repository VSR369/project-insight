import { Suspense } from "react";
import { lazyRetry as lazy } from "@/lib/lazyRetry";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
const RegistrationLayout = lazy(() => import("@/components/layouts/RegistrationLayout").then(m => ({ default: m.RegistrationLayout })));
import { AuthProvider } from "@/hooks/useAuth";
import { CogniShell } from "@/components/cogniblend/shell/CogniShell";
import { EnrollmentProvider } from "@/contexts/EnrollmentContext";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
const AdminShell = lazy(() => import("@/components/admin/AdminShell").then(m => ({ default: m.AdminShell })));
import { TierGuard } from "@/components/admin/TierGuard";
import { PermissionGuard } from "@/components/admin/PermissionGuard";
import { ReviewerGuard } from "@/components/auth/ReviewerGuard";
import { SeekerGuard } from "@/components/auth/SeekerGuard";
const OrgShell = lazy(() => import("@/components/org/OrgShell").then(m => ({ default: m.OrgShell })));
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
// LAZY IMPORTS — Auth & core pages (PERF: reduces initial bundle ~50-100KB)
// ============================================================================

// Auth Pages — eagerly loaded (critical path, prevents Suspense crashes on sync navigation)
import Login from "@/pages/Login";
import Register from "@/pages/Register";
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const InviteAccept = lazy(() => import("@/pages/InviteAccept"));

// Main Pages — eagerly loaded (immediate post-auth targets)
import Dashboard from "@/pages/Dashboard";
import Welcome from "@/pages/Welcome";
import NotFound from "@/pages/NotFound";

// Enrollment Wizard Pages (lazy loaded — reduces initial bundle by ~100KB)
const EnrollRegistration = lazy(() => import("@/pages/enroll/Registration"));
const EnrollParticipationMode = lazy(() => import("@/pages/enroll/ParticipationMode"));
const EnrollOrganization = lazy(() => import("@/pages/enroll/Organization"));
const EnrollExpertiseSelection = lazy(() => import("@/pages/enroll/ExpertiseSelection"));
const EnrollProofPoints = lazy(() => import("@/pages/enroll/ProofPoints"));
const EnrollAssessment = lazy(() => import("@/pages/enroll/Assessment"));
const TakeAssessment = lazy(() => import("@/pages/enroll/TakeAssessment"));
const AssessmentResults = lazy(() => import("@/pages/enroll/AssessmentResults"));
const PostEnrollmentWelcome = lazy(() => import("@/pages/enroll/PostEnrollmentWelcome"));
const AddProofPoint = lazy(() => import("@/pages/enroll/AddProofPoint"));
const EditProofPoint = lazy(() => import("@/pages/enroll/EditProofPoint"));
const OrganizationPending = lazy(() => import("@/pages/enroll/OrganizationPending"));
const OrganizationDeclined = lazy(() => import("@/pages/enroll/OrganizationDeclined"));
const InterviewScheduling = lazy(() => import("@/pages/enroll/InterviewScheduling"));
const PanelDiscussion = lazy(() => import("@/pages/enroll/PanelDiscussion"));
const Certification = lazy(() => import("@/pages/enroll/Certification"));
const ProviderDashboard = lazy(() => import("@/pages/ProviderDashboard"));

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

// Settings Pages (lazy loaded)
const SecuritySettingsPage = lazy(() => import("@/pages/settings/SecuritySettingsPage"));

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
const ProficiencyTaxonomyPage = lazy(() => import("@/pages/admin/proficiency-taxonomy").then(m => ({ default: m.ProficiencyTaxonomyPage })));
const QuestionBankPage = lazy(() => import("@/pages/admin/question-bank").then(m => ({ default: m.QuestionBankPage })));
const CapabilityTagsPage = lazy(() => import("@/pages/admin/capability-tags").then(m => ({ default: m.CapabilityTagsPage })));
const LevelSpecialityMapPage = lazy(() => import("@/pages/admin/level-speciality-map").then(m => ({ default: m.LevelSpecialityMapPage })));
const InvitationsPage = lazy(() => import("@/pages/admin/invitations").then(m => ({ default: m.InvitationsPage })));
const PanelReviewerInvitationsPage = lazy(() => import("@/pages/admin/invitations").then(m => ({ default: m.PanelReviewerInvitationsPage })));
const VipProviderInvitationsPage = lazy(() => import("@/pages/admin/invitations").then(m => ({ default: m.VipProviderInvitationsPage })));
const AdminSettingsPage = lazy(() => import("@/pages/admin/MasterDataPlaceholder").then(m => ({ default: m.AdminSettingsPage })));
const SmokeTestPage = lazy(() => import("@/pages/admin/SmokeTestPage"));
const TestSetupPage = lazy(() => import("@/pages/admin/TestSetupPage"));
const InterviewRequirementsPage = lazy(() => import("@/pages/admin/interview-requirements").then(m => ({ default: m.InterviewRequirementsPage })));
const ReviewerApprovalsPage = lazy(() => import("@/pages/admin/reviewer-approvals").then(m => ({ default: m.ReviewerApprovalsPage })));
const ReviewerAvailabilityPage = lazy(() => import("@/pages/admin/reviewer-availability").then(m => ({ default: m.ReviewerAvailabilityPage })));
const InterviewKitPage = lazy(() => import("@/pages/admin/interview-kit").then(m => ({ default: m.InterviewKitPage })));
const InterviewKitQuestionsPage = lazy(() => import("@/pages/admin/interview-kit").then(m => ({ default: m.InterviewKitQuestionsPage })));
const PulseSocialTestPage = lazy(() => import("@/pages/admin/PulseSocialTestPage"));
const RegressionTestKitPage = lazy(() => import("@/pages/admin/RegressionTestKitPage"));
const CommunicationsPage = lazy(() => import("@/pages/admin/CommunicationsPage"));

// Seeker Config Admin Pages (lazy loaded)
const DepartmentsPage = lazy(() => import("@/pages/admin/departments").then(m => ({ default: m.DepartmentsPage })));
const FunctionalAreasPage = lazy(() => import("@/pages/admin/functional-areas/FunctionalAreasPage"));
const SubscriptionTiersPage = lazy(() => import("@/pages/admin/subscription-tiers").then(m => ({ default: m.SubscriptionTiersPage })));
const EngagementModelsPage = lazy(() => import("@/pages/admin/engagement-models").then(m => ({ default: m.EngagementModelsPage })));
const ChallengeComplexityPage = lazy(() => import("@/pages/admin/challenge-complexity").then(m => ({ default: m.ChallengeComplexityPage })));
const SolutionMaturityPage = lazy(() => import("@/pages/admin/solution-maturity").then(m => ({ default: m.SolutionMaturityPage })));
const ChallengeStatusesPage = lazy(() => import("@/pages/admin/challenge-statuses").then(m => ({ default: m.ChallengeStatusesPage })));
const ExportControlPage = lazy(() => import("@/pages/admin/export-control").then(m => ({ default: m.ExportControlPage })));
const DataResidencyPage = lazy(() => import("@/pages/admin/data-residency").then(m => ({ default: m.DataResidencyPage })));
const BlockedDomainsPage = lazy(() => import("@/pages/admin/blocked-domains").then(m => ({ default: m.BlockedDomainsPage })));
const LegalDocumentTemplatesPage = lazy(() => import("@/pages/admin/seeker-config/LegalDocumentTemplatesPage"));
const LegalDocumentListPage = lazy(() => import("@/pages/admin/legal/LegalDocumentListPage"));
const LegalDocumentEditorPage = lazy(() => import("@/pages/admin/legal/LegalDocumentEditorPage"));
const LegalDocTriggerConfigPage = lazy(() => import("@/pages/admin/legal/LegalDocTriggerConfigPage"));
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
const GovernanceRulesPage = lazy(() => import("@/pages/admin/seeker-config/GovernanceRulesPage"));
const GovernanceModeConfigPage = lazy(() => import("@/pages/admin/seeker-config/GovernanceModeConfigPage"));
const RoleCoassignmentPage = lazy(() => import("@/pages/admin/seeker-config/RoleConvergencePage"));
const TierGovernanceAccessPage = lazy(() => import("@/pages/admin/seeker-config/TierGovernanceAccessPage"));
const LifecyclePhaseConfigPage = lazy(() => import("@/pages/admin/seeker-config/LifecyclePhaseConfigPage"));
const AIReviewConfigPage = lazy(() => import("@/pages/admin/seeker-config/AIReviewConfigPage"));
const LegalReviewThresholdsPage = lazy(() => import("@/pages/admin/seeker-config/LegalReviewThresholdsPage"));
const RateCardsPage = lazy(() => import("@/pages/admin/rate-cards").then(m => ({ default: m.RateCardsPage })));
const IncentivesPage = lazy(() => import("@/pages/admin/incentives").then(m => ({ default: m.IncentivesPage })));

// Platform Admin Management Pages (MOD-01, lazy loaded)
const PlatformAdminListPage = lazy(() => import("@/pages/admin/platform-admins/PlatformAdminListPage"));
const CreatePlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/CreatePlatformAdminPage"));
const EditPlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/EditPlatformAdminPage"));
const ViewPlatformAdminPage = lazy(() => import("@/pages/admin/platform-admins/ViewPlatformAdminPage"));
const MyProfilePage = lazy(() => import("@/pages/admin/platform-admins/MyProfilePage"));
const AvailabilitySettingsPage = lazy(() => import("@/pages/admin/platform-admins/AvailabilitySettingsPage"));

// MOD-02: Assignment Engine Audit Log (Supervisor only)
const AssignmentAuditLogPage = lazy(() => import("@/pages/admin/AssignmentAuditLogPage"));

// MOD-03: Verification Dashboard & Detail
const VerificationDashboardPage = lazy(() => import("@/pages/admin/verifications/VerificationDashboardPage"));
const VerificationDetailPage = lazy(() => import("@/pages/admin/verifications/VerificationDetailPage"));
const VerificationKnowledgeCentrePage = lazy(() => import("@/pages/admin/verifications/VerificationKnowledgeCentrePage"));

// Knowledge Centre Pages (one per sidebar group)
const DashboardKCPage = lazy(() => import("@/pages/admin/knowledge-centre/DashboardKCPage"));
const ReferenceDataKCPage = lazy(() => import("@/pages/admin/knowledge-centre/ReferenceDataKCPage"));
const InterviewReviewKCPage = lazy(() => import("@/pages/admin/knowledge-centre/InterviewReviewKCPage"));
const MarketplaceKCPage = lazy(() => import("@/pages/admin/knowledge-centre/MarketplaceKCPage"));
const SeekerConfigKCPage = lazy(() => import("@/pages/admin/knowledge-centre/SeekerConfigKCPage"));
const ContentInvitationsKCPage = lazy(() => import("@/pages/admin/knowledge-centre/ContentInvitationsKCPage"));
const MyWorkspaceKCPage = lazy(() => import("@/pages/admin/knowledge-centre/MyWorkspaceKCPage"));

// MOD-04: Notification Audit Log
const NotificationAuditLogPage = lazy(() => import("@/pages/admin/notifications/NotificationAuditLogPage"));

// MOD-05: Performance Metrics Dashboard
const AllAdminsPerformancePage = lazy(() => import("@/pages/admin/performance/AllAdminsPerformancePage"));
const MyPerformancePage = lazy(() => import("@/pages/admin/performance/MyPerformancePage"));
const AdminPerformanceDetailPage = lazy(() => import("@/pages/admin/performance/AdminPerformanceDetailPage"));

// MOD-06: Reassignment Workflow
const ReassignmentInboxPage = lazy(() => import("@/pages/admin/reassignments/ReassignmentInboxPage"));

// MOD-07: System Configuration
const SystemConfigPage = lazy(() => import("@/pages/admin/system-config/SystemConfigPage"));
const DomainWeightsPage = lazy(() => import("@/pages/admin/system-config/DomainWeightsPage"));

// Permissions Management (read-only reference)
const PermissionsManagementPage = lazy(() => import("@/pages/admin/permissions/PermissionsManagementPage"));

// RBAC MOD-01: Marketplace Resource Pool Management
const MarketplaceDashboard = lazy(() => import("@/pages/admin/marketplace/MarketplaceDashboard"));
const ResourcePoolPage = lazy(() => import("@/pages/admin/marketplace/ResourcePoolPage"));
const PoolMemberDetailPage = lazy(() => import("@/pages/admin/marketplace/PoolMemberDetailPage"));

// RBAC MOD-02: Solution Requests & Assignment History
const SolutionRequestsPage = lazy(() => import("@/pages/admin/marketplace/SolutionRequestsPage"));
const AssignmentHistoryPage = lazy(() => import("@/pages/admin/marketplace/AssignmentHistoryPage"));

// RBAC MOD-03: Role Management Dashboard, Admin Contact, Email Templates
const RoleManagementDashboard = lazy(() => import("@/pages/rbac/RoleManagementDashboard"));
const AdminContactProfilePage = lazy(() => import("@/pages/admin/marketplace/AdminContactProfilePage"));
const EmailTemplatesPage = lazy(() => import("@/pages/admin/marketplace/EmailTemplatesPage"));

// Org Portal — lazy loaded pages
const RoleReadinessPage = lazy(() => import("@/pages/org/RoleReadinessPage"));
const RoleInvitationResponsePage = lazy(() => import("@/pages/org/RoleInvitationResponsePage"));
const OrgContactProfilePage = lazy(() => import("@/pages/org/OrgContactProfilePage"));
const OrgEmailTemplatesPage = lazy(() => import("@/pages/org/OrgEmailTemplatesPage"));
const OrgKnowledgeCentrePage = lazy(() => import("@/pages/org/OrgKnowledgeCentrePage"));
const OrgShadowPricingPage = lazy(() => import("@/pages/org/OrgShadowPricingPage"));

// CogniBlend Pages (lazy loaded)
const CogniLoginPage = lazy(() => import("@/pages/cogniblend/CogniLoginPage"));
const DemoLoginPage = lazy(() => import("@/pages/cogniblend/DemoLoginPage"));
import CogniDashboardPage from "@/pages/cogniblend/CogniDashboardPage";

const CogniChallengeCreatePage = lazy(() => import("@/pages/cogniblend/ChallengeCreatePage"));
const AISpecReviewPage = lazy(() => import("@/pages/cogniblend/AISpecReviewPage"));
const ControlledEditorPage = lazy(() => import("@/pages/cogniblend/ControlledEditorPage"));
const ChallengeWizardPage = lazy(() => import("@/pages/cogniblend/ChallengeWizardPage"));
const LegalDocumentAttachmentPage = lazy(() => import("@/pages/cogniblend/LegalDocumentAttachmentPage"));
const CurationQueuePage = lazy(() => import("@/pages/cogniblend/CurationQueuePage"));
const CurationReviewPage = lazy(() => import("@/pages/cogniblend/CurationReviewPage"));
const CogniPlaceholderPage = lazy(() => import("@/pages/cogniblend/CogniPlaceholderPage"));
const WinnerSelectionPage = lazy(() => import("@/pages/cogniblend/WinnerSelectionPage"));
const MyChallengesPage = lazy(() => import("@/pages/cogniblend/MyChallengesPage"));
const PublicationReadinessPage = lazy(() => import("@/pages/cogniblend/PublicationReadinessPage"));
const PublicChallengeDetailPage = lazy(() => import("@/pages/cogniblend/PublicChallengeDetailPage"));
const ChallengeManagePage = lazy(() => import("@/pages/cogniblend/ChallengeManagePage"));
const SolutionSubmitPage = lazy(() => import("@/pages/cogniblend/SolutionSubmitPage"));
const FullSolutionUploadPage = lazy(() => import("@/pages/cogniblend/FullSolutionUploadPage"));
const ScreeningReviewPage = lazy(() => import("@/pages/cogniblend/ScreeningReviewPage"));
const LcReviewQueuePage = lazy(() => import("@/pages/cogniblend/LcReviewQueuePage"));
const LcReviewPanel = lazy(() => import("@/pages/cogniblend/LcReviewPanel"));
const LcLegalWorkspacePage = lazy(() => import("@/pages/cogniblend/LcLegalWorkspacePage"));
const EscrowManagementPage = lazy(() => import("@/pages/cogniblend/EscrowManagementPage"));
const FcChallengeQueuePage = lazy(() => import("@/pages/cogniblend/FcChallengeQueuePage"));
const LcChallengeQueuePage = lazy(() => import("@/pages/cogniblend/LcChallengeQueuePage"));
const BrowseChallengesPage = lazy(() => import("@/pages/cogniblend/BrowseChallengesPage"));

// Public Pages (P4)
const HomePage = lazy(() => import("@/pages/public/HomePage"));
const ChallengeDetailPublicPage = lazy(() => import("@/pages/public/ChallengeDetailPublic"));

// AI Quality Dashboard (Phase 10)
const AIQualityDashboardPage = lazy(() => import("@/pages/admin/AIQualityDashboardPage"));
const ExampleLibraryManagerPage = lazy(() => import("@/pages/admin/ExampleLibraryManagerPage"));

// Phase 11: Industry + Geography Intelligence
const IndustryPacksPage = lazy(() => import("@/pages/admin/industry-packs/IndustryPacksPage"));
const GeographyContextPage = lazy(() => import("@/pages/admin/geography-context/GeographyContextPage"));

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
const AdminManagementPage = lazy(() => import("@/pages/org/AdminManagementPage"));
const CreateDelegatedAdminPage = lazy(() => import("@/pages/org/CreateDelegatedAdminPage"));
const EditDelegatedAdminPage = lazy(() => import("@/pages/org/EditDelegatedAdminPage"));
const ActivationPage = lazy(() => import("@/pages/ActivationPage"));
const OrgAdminLoginPage = lazy(() => import("@/pages/org/OrgAdminLoginPage"));
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
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AuthProvider>
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
            <Route path="/activate" element={<LazyRoute><ActivationPage /></LazyRoute>} />
            <Route path="/org/login" element={<LazyRoute><OrgAdminLoginPage /></LazyRoute>} />

            {/* CogniBlend Routes */}
            <Route path="/cogni/login" element={<LazyRoute><CogniLoginPage /></LazyRoute>} />
            <Route path="/cogni/demo-login" element={<LazyRoute><DemoLoginPage /></LazyRoute>} />
            <Route element={
              <AuthGuard>
                <CogniShell />
              </AuthGuard>
            }>
              <Route path="/cogni/dashboard" element={<CogniDashboardPage />} />
              <Route path="/cogni/challenges/create" element={<LazyRoute><CogniChallengeCreatePage /></LazyRoute>} />
              <Route path="/cogni/challenges/new" element={<Navigate to="/cogni/challenges/create" replace />} />
              <Route path="/cogni/challenges/:id/spec" element={<LazyRoute><AISpecReviewPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/controlled-edit" element={<LazyRoute><ControlledEditorPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/edit" element={<LazyRoute><ChallengeWizardPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/legal" element={<LazyRoute><LegalDocumentAttachmentPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/lc-legal" element={<LazyRoute><LcLegalWorkspacePage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/publish" element={<LazyRoute><PublicationReadinessPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/view" element={<LazyRoute><PublicChallengeDetailPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/manage" element={<LazyRoute><ChallengeManagePage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/submit" element={<LazyRoute><SolutionSubmitPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/solutions/:solId/upload" element={<LazyRoute><FullSolutionUploadPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id/screen" element={<LazyRoute><ScreeningReviewPage /></LazyRoute>} />
              <Route path="/cogni/challenges/:id" element={<LazyRoute><ChallengeManagePage /></LazyRoute>} />
              <Route path="/cogni/curation" element={<LazyRoute><CurationQueuePage /></LazyRoute>} />
              <Route path="/cogni/curation/:id" element={<LazyRoute><CurationReviewPage /></LazyRoute>} />

              {/* My Challenges */}
              <Route path="/cogni/my-challenges" element={<LazyRoute><MyChallengesPage /></LazyRoute>} />
              <Route path="/cogni/lc-queue" element={<LazyRoute><LcChallengeQueuePage /></LazyRoute>} />
              <Route path="/cogni/legal" element={<LazyRoute><CogniPlaceholderPage title="Legal Documents" description="Manage legal templates and document attachments for challenges." /></LazyRoute>} />
              <Route path="/cogni/legal-review" element={<LazyRoute><LcReviewQueuePage /></LazyRoute>} />
              <Route path="/cogni/legal-review/:challengeId" element={<LazyRoute><LcReviewPanel /></LazyRoute>} />
              <Route path="/cogni/review" element={<LazyRoute><CogniPlaceholderPage title="Review Queue" description="Review submitted solutions awaiting expert evaluation." /></LazyRoute>} />
              <Route path="/cogni/evaluation" element={<LazyRoute><CogniPlaceholderPage title="Evaluation Panel" description="Score and rank solutions using evaluation rubrics." /></LazyRoute>} />
              <Route path="/cogni/selection" element={<LazyRoute><WinnerSelectionPage /></LazyRoute>} />
              <Route path="/cogni/escrow" element={<LazyRoute><EscrowManagementPage /></LazyRoute>} />
              <Route path="/cogni/fc-queue" element={<LazyRoute><FcChallengeQueuePage /></LazyRoute>} />
              <Route path="/cogni/payments" element={<LazyRoute><CogniPlaceholderPage title="Payment Processing" description="Process prize payments and manage financial transactions." /></LazyRoute>} />
              <Route path="/cogni/browse" element={<LazyRoute><BrowseChallengesPage /></LazyRoute>} />
              <Route path="/cogni/my-solutions" element={<LazyRoute><CogniPlaceholderPage title="My Solutions" description="Track your submitted solutions and their evaluation status." /></LazyRoute>} />
              <Route path="/cogni/portfolio" element={<LazyRoute><CogniPlaceholderPage title="My Portfolio" description="Manage your solver profile and showcase your expertise." /></LazyRoute>} />
            </Route>

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
                  <EnrollmentProvider>
                    <Dashboard />
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/provider-dashboard"
              element={
                <AuthGuard>
                  <LazyRoute><ProviderDashboard /></LazyRoute>
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

            {/* Enrollment Wizard (9-step flow - no sidebar) — scoped EnrollmentProvider */}
            <Route
              path="/enroll/registration"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <LazyRoute><EnrollRegistration /></LazyRoute>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/welcome"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <LazyRoute><PostEnrollmentWelcome /></LazyRoute>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/participation-mode"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EnrollParticipationMode /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EnrollOrganization /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/expertise"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EnrollExpertiseSelection /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EnrollProofPoints /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points/add"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><AddProofPoint /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points/edit/:id"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EditProofPoint /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization-pending"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><OrganizationPending /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization-declined"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><OrganizationDeclined /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><EnrollAssessment /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment/take"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><TakeAssessment /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/assessment/results"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><AssessmentResults /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/interview-slot"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><InterviewScheduling /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/panel-discussion"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><PanelDiscussion /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/certification"
              element={
                <AuthGuard>
                  <EnrollmentProvider>
                    <EnrollmentRequiredGuard>
                      <LazyRoute><Certification /></LazyRoute>
                    </EnrollmentRequiredGuard>
                  </EnrollmentProvider>
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
            <Route
              path="/settings/security"
              element={
                <AuthGuard>
                  <LazyRoute><SecuritySettingsPage /></LazyRoute>
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
            <Route path="/admin" element={
              <ErrorBoundary componentName="Admin Portal">
                <AdminGuard><AdminShell /></AdminGuard>
              </ErrorBoundary>
            }>
              <Route index element={<AdminDashboard />} />
              {/* Master Data — permission: master_data.view (read-only for basic admin) */}
              <Route path="master-data/countries" element={<PermissionGuard permissionKey="master_data.view"><CountriesPage /></PermissionGuard>} />
              <Route path="master-data/industry-segments" element={<PermissionGuard permissionKey="master_data.view"><IndustrySegmentsPage /></PermissionGuard>} />
              <Route path="master-data/organization-types" element={<PermissionGuard permissionKey="master_data.view"><OrganizationTypesPage /></PermissionGuard>} />
              <Route path="master-data/participation-modes" element={<PermissionGuard permissionKey="master_data.view"><ParticipationModesPage /></PermissionGuard>} />
              <Route path="master-data/expertise-levels" element={<PermissionGuard permissionKey="master_data.view"><ExpertiseLevelsPage /></PermissionGuard>} />
              {/* Taxonomy — permission: taxonomy.view */}
              <Route path="master-data/proficiency-taxonomy" element={<PermissionGuard permissionKey="taxonomy.view"><ProficiencyTaxonomyPage /></PermissionGuard>} />
              <Route path="master-data/departments" element={<PermissionGuard permissionKey="master_data.view"><DepartmentsPage /></PermissionGuard>} />
              <Route path="master-data/functional-areas" element={<PermissionGuard permissionKey="master_data.view"><FunctionalAreasPage /></PermissionGuard>} />
              {/* Content — permission: content.view_questions */}
              <Route path="questions" element={<PermissionGuard permissionKey="content.view_questions"><QuestionBankPage /></PermissionGuard>} />
              <Route path="capability-tags" element={<PermissionGuard permissionKey="content.view_questions"><CapabilityTagsPage /></PermissionGuard>} />
              <Route path="level-speciality-map" element={<PermissionGuard permissionKey="master_data.view"><LevelSpecialityMapPage /></PermissionGuard>} />
              {/* Invitations — permission: invitations.view */}
              <Route path="invitations" element={<PermissionGuard permissionKey="invitations.view"><InvitationsPage /></PermissionGuard>} />
              <Route path="invitations/panel-reviewers" element={<PermissionGuard permissionKey="invitations.view"><PanelReviewerInvitationsPage /></PermissionGuard>} />
              <Route path="invitations/vip-experts" element={<PermissionGuard permissionKey="invitations.view"><VipProviderInvitationsPage /></PermissionGuard>} />
              {/* Dev Tools — permission: supervisor.configure_system */}
              <Route path="smoke-test" element={<PermissionGuard permissionKey="supervisor.configure_system"><SmokeTestPage /></PermissionGuard>} />
              <Route path="test-setup" element={<PermissionGuard permissionKey="supervisor.configure_system"><TestSetupPage /></PermissionGuard>} />
              {/* Settings — permission: admin_management.view_settings */}
              <Route path="settings" element={<PermissionGuard permissionKey="admin_management.view_settings"><AdminSettingsPage /></PermissionGuard>} />
              {/* Interview Setup — permission: interview.view */}
              <Route path="interview/kit" element={<PermissionGuard permissionKey="interview.view"><InterviewKitPage /></PermissionGuard>} />
              <Route path="interview/kit/questions" element={<PermissionGuard permissionKey="interview.view"><InterviewKitQuestionsPage /></PermissionGuard>} />
              <Route path="interview/quorum-requirements" element={<PermissionGuard permissionKey="interview.view"><InterviewRequirementsPage /></PermissionGuard>} />
              <Route path="reviewer-approvals" element={<PermissionGuard permissionKey="interview.view"><ReviewerApprovalsPage /></PermissionGuard>} />
              <Route path="interview/reviewer-availability" element={<PermissionGuard permissionKey="interview.view"><ReviewerAvailabilityPage /></PermissionGuard>} />
              <Route path="pulse-social-test" element={<PermissionGuard permissionKey="supervisor.configure_system"><PulseSocialTestPage /></PermissionGuard>} />
              <Route path="regression-test-kit" element={<PermissionGuard permissionKey="supervisor.configure_system"><RegressionTestKitPage /></PermissionGuard>} />
              {/* Communications Governance */}
              <Route path="communications" element={<PermissionGuard permissionKey="supervisor.configure_system"><CommunicationsPage /></PermissionGuard>} />
              {/* Seeker Config — permission: seeker_config.view */}
              <Route path="seeker-config/pricing-overview" element={<PermissionGuard permissionKey="seeker_config.view"><PricingOverviewPage /></PermissionGuard>} />
              <Route path="seeker-config/subscription-tiers" element={<PermissionGuard permissionKey="seeker_config.view"><SubscriptionTiersPage /></PermissionGuard>} />
              <Route path="seeker-config/engagement-models" element={<PermissionGuard permissionKey="seeker_config.view"><EngagementModelsPage /></PermissionGuard>} />
              <Route path="seeker-config/challenge-complexity" element={<PermissionGuard permissionKey="seeker_config.view"><ChallengeComplexityPage /></PermissionGuard>} />
              <Route path="seeker-config/challenge-statuses" element={<PermissionGuard permissionKey="seeker_config.view"><ChallengeStatusesPage /></PermissionGuard>} />
              <Route path="seeker-config/solution-maturity" element={<PermissionGuard permissionKey="seeker_config.view"><SolutionMaturityPage /></PermissionGuard>} />
              {/* Compliance Config — permission: seeker_config.manage_compliance */}
              <Route path="seeker-config/export-control" element={<PermissionGuard permissionKey="seeker_config.manage_compliance"><ExportControlPage /></PermissionGuard>} />
              <Route path="seeker-config/data-residency" element={<PermissionGuard permissionKey="seeker_config.manage_compliance"><DataResidencyPage /></PermissionGuard>} />
              <Route path="seeker-config/blocked-domains" element={<PermissionGuard permissionKey="seeker_config.manage_compliance"><BlockedDomainsPage /></PermissionGuard>} />
              <Route path="seeker-config/platform-terms" element={<PermissionGuard permissionKey="seeker_config.view"><PlatformTermsPage /></PermissionGuard>} />
              <Route path="seeker-config/legal-templates" element={<PermissionGuard permissionKey="seeker_config.view"><LegalDocumentTemplatesPage /></PermissionGuard>} />
              <Route path="legal-documents" element={<PermissionGuard permissionKey="seeker_config.edit"><LegalDocumentListPage /></PermissionGuard>} />
              <Route path="legal-documents/new" element={<PermissionGuard permissionKey="seeker_config.edit"><LegalDocumentEditorPage /></PermissionGuard>} />
              <Route path="legal-documents/:templateId/edit" element={<PermissionGuard permissionKey="seeker_config.edit"><LegalDocumentEditorPage /></PermissionGuard>} />
              <Route path="legal-documents/triggers" element={<PermissionGuard permissionKey="seeker_config.edit"><LegalDocTriggerConfigPage /></PermissionGuard>} />
              <Route path="seeker-config/membership-tiers" element={<PermissionGuard permissionKey="seeker_config.view"><MembershipTiersPage /></PermissionGuard>} />
              <Route path="seeker-config/base-fees" element={<PermissionGuard permissionKey="seeker_config.view"><BaseFeesPage /></PermissionGuard>} />
              <Route path="seeker-config/shadow-pricing" element={<PermissionGuard permissionKey="seeker_config.view_shadow_pricing"><ShadowPricingPage /></PermissionGuard>} />
              <Route path="seeker-config/platform-fees" element={<PermissionGuard permissionKey="seeker_config.view"><PlatformFeesPage /></PermissionGuard>} />
              <Route path="seeker-config/tax-formats" element={<PermissionGuard permissionKey="seeker_config.view"><TaxFormatsPage /></PermissionGuard>} />
              <Route path="seeker-config/subsidized-pricing" element={<PermissionGuard permissionKey="seeker_config.view"><SubsidizedPricingPage /></PermissionGuard>} />
              <Route path="seeker-config/postal-formats" element={<PermissionGuard permissionKey="seeker_config.view"><PostalFormatsPage /></PermissionGuard>} />
              <Route path="seeker-config/billing-cycles" element={<PermissionGuard permissionKey="seeker_config.view"><BillingCyclesPage /></PermissionGuard>} />
              <Route path="seeker-config/payment-methods" element={<PermissionGuard permissionKey="seeker_config.view"><PaymentMethodsPage /></PermissionGuard>} />
              <Route path="seeker-config/governance-rules" element={<PermissionGuard permissionKey="seeker_config.view"><GovernanceRulesPage /></PermissionGuard>} />
              <Route path="seeker-config/governance-modes" element={<PermissionGuard permissionKey="seeker_config.edit"><GovernanceModeConfigPage /></PermissionGuard>} />
              <Route path="seeker-config/role-coassignment" element={<PermissionGuard permissionKey="seeker_config.edit"><RoleCoassignmentPage /></PermissionGuard>} />
              <Route path="seeker-config/role-convergence" element={<Navigate to="/admin/seeker-config/role-coassignment" replace />} />
              <Route path="seeker-config/tier-access" element={<PermissionGuard permissionKey="seeker_config.edit"><TierGovernanceAccessPage /></PermissionGuard>} />
              <Route path="seeker-config/lifecycle-phases" element={<PermissionGuard permissionKey="seeker_config.edit"><LifecyclePhaseConfigPage /></PermissionGuard>} />
              <Route path="seeker-config/ai-review-config" element={<PermissionGuard permissionKey="supervisor.configure_system"><AIReviewConfigPage /></PermissionGuard>} />
              <Route path="seeker-config/rate-cards" element={<PermissionGuard permissionKey="seeker_config.view"><RateCardsPage /></PermissionGuard>} />
              <Route path="seeker-config/incentives" element={<PermissionGuard permissionKey="seeker_config.view"><IncentivesPage /></PermissionGuard>} />
              <Route path="seeker-config/legal-thresholds" element={<PermissionGuard permissionKey="seeker_config.view"><LegalReviewThresholdsPage /></PermissionGuard>} />

              <Route path="saas-agreements" element={<PermissionGuard permissionKey="org_approvals.manage_agreements"><SaasAgreementPage /></PermissionGuard>} />
              {/* Org Approvals — permission: org_approvals.view */}
              <Route path="seeker-org-approvals" element={<PermissionGuard permissionKey="org_approvals.view"><SeekerOrgApprovalsPage /></PermissionGuard>} />
              <Route path="seeker-org-approvals/:orgId" element={<PermissionGuard permissionKey="org_approvals.view"><SeekerOrgReviewPage /></PermissionGuard>} />
              {/* Platform Admin Management — permission: admin_management.view_all_admins */}
              <Route path="platform-admins" element={<PermissionGuard permissionKey="admin_management.view_all_admins"><PlatformAdminListPage /></PermissionGuard>} />
              <Route path="platform-admins/new" element={<PermissionGuard permissionKey="admin_management.view_all_admins"><CreatePlatformAdminPage /></PermissionGuard>} />
              <Route path="platform-admins/:adminId" element={<PermissionGuard permissionKey="admin_management.view_all_admins"><ViewPlatformAdminPage /></PermissionGuard>} />
              <Route path="platform-admins/:adminId/edit" element={<PermissionGuard permissionKey="supervisor.manage_permissions"><EditPlatformAdminPage /></PermissionGuard>} />
              <Route path="my-profile" element={<MyProfilePage />} />
              <Route path="availability" element={<AvailabilitySettingsPage />} />
              {/* Assignment Engine Audit Log — permission: supervisor.view_audit_logs */}
              <Route path="assignment-audit-log" element={<PermissionGuard permissionKey="supervisor.view_audit_logs"><AssignmentAuditLogPage /></PermissionGuard>} />
              {/* Verification Dashboard & Detail — permission: verification.view_dashboard */}
              <Route path="verifications" element={<PermissionGuard permissionKey="verification.view_dashboard"><VerificationDashboardPage /></PermissionGuard>} />
              <Route path="verifications/:id" element={<PermissionGuard permissionKey="verification.view_dashboard"><VerificationDetailPage /></PermissionGuard>} />
              <Route path="verification-knowledge-centre" element={<VerificationKnowledgeCentrePage />} />
              {/* Group-specific Knowledge Centre pages — always accessible */}
              <Route path="kc/dashboard" element={<DashboardKCPage />} />
              <Route path="kc/reference-data" element={<ReferenceDataKCPage />} />
              <Route path="kc/interview-review" element={<InterviewReviewKCPage />} />
              <Route path="kc/marketplace" element={<MarketplaceKCPage />} />
              <Route path="kc/seeker-config" element={<SeekerConfigKCPage />} />
              <Route path="kc/content-invitations" element={<ContentInvitationsKCPage />} />
              <Route path="kc/my-workspace" element={<MyWorkspaceKCPage />} />
              {/* Notification Audit Log — permission: supervisor.view_audit_logs */}
              <Route path="notifications/audit" element={<PermissionGuard permissionKey="supervisor.view_audit_logs"><NotificationAuditLogPage /></PermissionGuard>} />
              {/* Performance Metrics — supervisor.view_team_performance */}
              <Route path="performance" element={<PermissionGuard permissionKey="supervisor.view_team_performance"><AllAdminsPerformancePage /></PermissionGuard>} />
              <Route path="my-performance" element={<MyPerformancePage />} />
              <Route path="performance/:adminId" element={<PermissionGuard permissionKey="supervisor.view_team_performance"><AdminPerformanceDetailPage /></PermissionGuard>} />
              {/* Reassignment Workflow — permission: supervisor.approve_reassignments */}
              <Route path="reassignments" element={<PermissionGuard permissionKey="supervisor.approve_reassignments"><ReassignmentInboxPage /></PermissionGuard>} />
              {/* System Configuration — permission: supervisor.configure_system */}
              <Route path="system-config" element={<PermissionGuard permissionKey="supervisor.configure_system"><SystemConfigPage /></PermissionGuard>} />
              <Route path="system-config/domain-weights" element={<PermissionGuard permissionKey="supervisor.configure_system"><DomainWeightsPage /></PermissionGuard>} />
              {/* Permissions Management — permission: supervisor.manage_permissions */}
              <Route path="permissions" element={<PermissionGuard permissionKey="supervisor.manage_permissions"><PermissionsManagementPage /></PermissionGuard>} />
              {/* Marketplace — permission: marketplace.view */}
              <Route path="marketplace" element={<PermissionGuard permissionKey="marketplace.view"><MarketplaceDashboard /></PermissionGuard>} />
              <Route path="marketplace/resource-pool" element={<PermissionGuard permissionKey="marketplace.view"><ResourcePoolPage /></PermissionGuard>} />
              <Route path="marketplace/resource-pool/:memberId" element={<PermissionGuard permissionKey="marketplace.view"><PoolMemberDetailPage /></PermissionGuard>} />
              {/* Solution Requests & Assignment History — permission: marketplace.view */}
              <Route path="marketplace/solution-requests" element={<PermissionGuard permissionKey="marketplace.view"><SolutionRequestsPage /></PermissionGuard>} />
              <Route path="marketplace/assignment-history" element={<PermissionGuard permissionKey="marketplace.view"><AssignmentHistoryPage /></PermissionGuard>} />
              {/* Admin Contact, Email Templates — permission: marketplace.manage_config */}
              <Route path="marketplace/admin-contact" element={<PermissionGuard permissionKey="marketplace.manage_config"><AdminContactProfilePage /></PermissionGuard>} />
              <Route path="marketplace/email-templates" element={<PermissionGuard permissionKey="marketplace.manage_config"><EmailTemplatesPage /></PermissionGuard>} />
              {/* AI Quality Dashboard (Phase 10) — supervisor only */}
              <Route path="ai-quality" element={<PermissionGuard permissionKey="supervisor.configure_system"><AIQualityDashboardPage /></PermissionGuard>} />
              <Route path="ai-quality/examples" element={<PermissionGuard permissionKey="supervisor.configure_system"><ExampleLibraryManagerPage /></PermissionGuard>} />
              {/* Phase 11: Industry + Geography Intelligence — supervisor only */}
              <Route path="industry-packs" element={<PermissionGuard permissionKey="supervisor.configure_system"><IndustryPacksPage /></PermissionGuard>} />
              <Route path="geography-context" element={<PermissionGuard permissionKey="supervisor.configure_system"><GeographyContextPage /></PermissionGuard>} />
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
                <ErrorBoundary componentName="Reviewer Portal">
                  <ReviewerGuard>
                    <LazyRoute><ReviewerDashboard /></LazyRoute>
                  </ReviewerGuard>
                </ErrorBoundary>
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
                <ErrorBoundary componentName="Pulse">
                  <AuthGuard>
                    <LazyRoute><PulseFeedPage /></LazyRoute>
                  </AuthGuard>
                </ErrorBoundary>
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

            {/* Seeker Organization Routes — nested under OrgShell for persistent sidebar */}
            <Route path="/org" element={
              <ErrorBoundary componentName="Organization Portal">
                <SeekerGuard><OrgShell /></SeekerGuard>
              </ErrorBoundary>
            }>
              <Route path="dashboard" element={<OrgDashboardPage />} />
              <Route path="challenges" element={<ChallengeListPage />} />
              <Route path="challenges/create" element={<ChallengeCreatePage />} />
              <Route path="settings" element={<OrgSettingsPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="parent-dashboard" element={<ParentDashboardPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="billing" element={<OrgBillingPage />} />
              <Route path="admin-management" element={<AdminManagementPage />} />
              <Route path="admin-management/create" element={<CreateDelegatedAdminPage />} />
              <Route path="admin-management/:adminId/edit" element={<EditDelegatedAdminPage />} />
              <Route path="role-management" element={<RoleManagementDashboard />} />
              
              <Route path="role-readiness" element={<LazyRoute><RoleReadinessPage /></LazyRoute>} />
              <Route path="role-invitation" element={<LazyRoute><RoleInvitationResponsePage /></LazyRoute>} />
              <Route path="contact-profile" element={<LazyRoute><OrgContactProfilePage /></LazyRoute>} />
              <Route path="email-templates" element={<LazyRoute><OrgEmailTemplatesPage /></LazyRoute>} />
              <Route path="knowledge-centre" element={<LazyRoute><OrgKnowledgeCentrePage /></LazyRoute>} />
              <Route path="shadow-pricing" element={<LazyRoute><OrgShadowPricingPage /></LazyRoute>} />
            </Route>
            <Route
              path="/registration/complete"
              element={
                <LazyRoute><OnboardingCompletePage /></LazyRoute>
              }
            />
            {/* SaasAgreementPage moved to nested /admin route above */}

            {/* Solution Request Routes — removed (role architecture v2) */}

            {/* Public pages */}
            <Route path="/home" element={<LazyRoute><HomePage /></LazyRoute>} />
            <Route path="/challenges/:id" element={<LazyRoute><ChallengeDetailPublicPage /></LazyRoute>} />

            {/* Role-based redirect for root route */}
            <Route path="/" element={<RoleBasedRedirect />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
