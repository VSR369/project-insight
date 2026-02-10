import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EnrollmentProvider } from "@/contexts/EnrollmentContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { ReviewerGuard } from "@/components/auth/ReviewerGuard";
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

// Pulse Pages (primary user experience - instant load)
import { PulseFeedPage, PulseSparksPage, PulseCreatePage, PulseRanksPage, PulseProfilePage, PulseContentDetailPage, PulsePublicProfilePage, PulseCardsPage, PulseCardDetailPage, PulseModerationPage, PulseStandupPage, PulseReelsPage, PulsePodcastsPage, PulseArticlesPage, PulseGalleryPage } from "@/pages/pulse";

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
            <Route path="/registration/organization-identity" element={
              <RegistrationProvider>
                <LazyRoute><OrganizationIdentityPage /></LazyRoute>
              </RegistrationProvider>
            } />
            
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

            {/* Admin Routes (all lazy loaded) */}
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <LazyRoute><AdminDashboard /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/countries"
              element={
                <AdminGuard>
                  <LazyRoute><CountriesPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/industry-segments"
              element={
                <AdminGuard>
                  <LazyRoute><IndustrySegmentsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/organization-types"
              element={
                <AdminGuard>
                  <LazyRoute><OrganizationTypesPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/participation-modes"
              element={
                <AdminGuard>
                  <LazyRoute><ParticipationModesPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/expertise-levels"
              element={
                <AdminGuard>
                  <LazyRoute><ExpertiseLevelsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/academic-taxonomy"
              element={
                <AdminGuard>
                  <LazyRoute><AcademicTaxonomyPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/proficiency-taxonomy"
              element={
                <AdminGuard>
                  <LazyRoute><ProficiencyTaxonomyPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/questions"
              element={
                <AdminGuard>
                  <LazyRoute><QuestionBankPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/capability-tags"
              element={
                <AdminGuard>
                  <LazyRoute><CapabilityTagsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/level-speciality-map"
              element={
                <AdminGuard>
                  <LazyRoute><LevelSpecialityMapPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/invitations"
              element={
                <AdminGuard>
                  <LazyRoute><InvitationsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/invitations/panel-reviewers"
              element={
                <AdminGuard>
                  <LazyRoute><PanelReviewerInvitationsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/smoke-test"
              element={
                <AdminGuard>
                  <LazyRoute><SmokeTestPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminGuard>
                  <LazyRoute><AdminSettingsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/interview/kit"
              element={
                <AdminGuard>
                  <LazyRoute><InterviewKitPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/interview/kit/questions"
              element={
                <AdminGuard>
                  <LazyRoute><InterviewKitQuestionsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/interview/quorum-requirements"
              element={
                <AdminGuard>
                  <LazyRoute><InterviewRequirementsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/reviewer-approvals"
              element={
                <AdminGuard>
                  <LazyRoute><ReviewerApprovalsPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/interview/reviewer-availability"
              element={
                <AdminGuard>
                  <LazyRoute><ReviewerAvailabilityPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/pulse-social-test"
              element={
                <AdminGuard>
                  <LazyRoute><PulseSocialTestPage /></LazyRoute>
                </AdminGuard>
              }
            />
            <Route
              path="/admin/regression-test-kit"
              element={
                <AdminGuard>
                  <LazyRoute><RegressionTestKitPage /></LazyRoute>
                </AdminGuard>
              }
            />

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
                  <PulseFeedPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/sparks"
              element={
                <AuthGuard>
                  <PulseSparksPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/reels"
              element={
                <AuthGuard>
                  <PulseReelsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/podcasts"
              element={
                <AuthGuard>
                  <PulsePodcastsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/articles"
              element={
                <AuthGuard>
                  <PulseArticlesPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/gallery"
              element={
                <AuthGuard>
                  <PulseGalleryPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/create"
              element={
                <AuthGuard>
                  <PulseCreatePage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/ranks"
              element={
                <AuthGuard>
                  <PulseRanksPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/profile"
              element={
                <AuthGuard>
                  <PulseProfilePage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/profile/:providerId"
              element={
                <AuthGuard>
                  <PulsePublicProfilePage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/content/:contentId"
              element={
                <AuthGuard>
                  <PulseContentDetailPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/cards"
              element={
                <AuthGuard>
                  <PulseCardsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/cards/:cardId"
              element={
                <AuthGuard>
                  <PulseCardDetailPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/moderation"
              element={
                <AuthGuard>
                  <PulseModerationPage />
                </AuthGuard>
              }
            />
            <Route
              path="/pulse/standup"
              element={
                <AuthGuard>
                  <PulseStandupPage />
                </AuthGuard>
              }
            />

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
