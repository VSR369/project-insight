import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";

// Auth Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Main Pages
import Dashboard from "@/pages/Dashboard";
import Welcome from "@/pages/Welcome";
import NotFound from "@/pages/NotFound";

// Enrollment Wizard Pages (new 9-step flow)
import {
  EnrollRegistration,
  EnrollParticipationMode,
  EnrollOrganization,
  EnrollExpertiseSelection,
  EnrollProofPoints,
} from "@/pages/enroll";

// Placeholder Pages
import { 
  ProfilePage, 
  InvitationsPage as UserInvitationsPage, 
  AssessmentPage, 
  KnowledgeCentrePage, 
  SettingsPage 
} from "@/pages/PlaceholderPages";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import { CountriesPage } from "@/pages/admin/countries";
import { IndustrySegmentsPage } from "@/pages/admin/industry-segments";
import { OrganizationTypesPage } from "@/pages/admin/organization-types";
import { ParticipationModesPage } from "@/pages/admin/participation-modes";
import { ExpertiseLevelsPage } from "@/pages/admin/expertise-levels";
import { AcademicTaxonomyPage } from "@/pages/admin/academic-taxonomy";
import { ProficiencyTaxonomyPage } from "@/pages/admin/proficiency-taxonomy";
import { QuestionBankPage } from "@/pages/admin/question-bank";
import { CapabilityTagsPage } from "@/pages/admin/capability-tags";
import { LevelSpecialityMapPage } from "@/pages/admin/level-speciality-map";
import { InvitationsPage } from "@/pages/admin/invitations";
import { AdminSettingsPage } from "@/pages/admin/MasterDataPlaceholder";
import SmokeTestPage from "@/pages/admin/SmokeTestPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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
              path="/enroll/participation-mode"
              element={
                <AuthGuard>
                  <EnrollParticipationMode />
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/organization"
              element={
                <AuthGuard>
                  <EnrollOrganization />
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/expertise"
              element={
                <AuthGuard>
                  <EnrollExpertiseSelection />
                </AuthGuard>
              }
            />
            <Route
              path="/enroll/proof-points"
              element={
                <AuthGuard>
                  <EnrollProofPoints />
                </AuthGuard>
              }
            />

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

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/countries"
              element={
                <AdminGuard>
                  <CountriesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/industry-segments"
              element={
                <AdminGuard>
                  <IndustrySegmentsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/organization-types"
              element={
                <AdminGuard>
                  <OrganizationTypesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/participation-modes"
              element={
                <AdminGuard>
                  <ParticipationModesPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/expertise-levels"
              element={
                <AdminGuard>
                  <ExpertiseLevelsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/academic-taxonomy"
              element={
                <AdminGuard>
                  <AcademicTaxonomyPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/master-data/proficiency-taxonomy"
              element={
                <AdminGuard>
                  <ProficiencyTaxonomyPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/questions"
              element={
                <AdminGuard>
                  <QuestionBankPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/capability-tags"
              element={
                <AdminGuard>
                  <CapabilityTagsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/level-speciality-map"
              element={
                <AdminGuard>
                  <LevelSpecialityMapPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/invitations"
              element={
                <AdminGuard>
                  <InvitationsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/smoke-test"
              element={
                <AdminGuard>
                  <SmokeTestPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminGuard>
                  <AdminSettingsPage />
                </AdminGuard>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
