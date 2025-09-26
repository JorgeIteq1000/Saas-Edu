import React, { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";
import CoursesPage from "./components/courses/CoursesPage";
import UsersPage from "./pages/UsersPage";
import EnrollmentsPage from "./pages/EnrollmentsPage";
import SalesPage from "./pages/SalesPage";
import FinancePage from "./pages/FinancePage";
import ProtocolsPage from "./pages/ProtocolsPage";
import SettingsPage from "./pages/SettingsPage";
import ReportsPage from "./pages/ReportsPage";
import DocumentsPage from "./pages/DocumentsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ContractsPage from "./pages/ContractsPage";
import MyEnrollmentsPage from "./pages/MyEnrollmentsPage";
import MyProtocolsPage from "./pages/MyProtocolsPage";
import UserPermissionsPage from "./pages/UserPermissionsPage";
import CertificatesPage from "./pages/CertificatesPage";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import NotFound from "./pages/NotFound";

const App: React.FC = () => {
  console.log('✅ App component renderizando...');
  
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/enrollments" element={<EnrollmentsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/protocols" element={<ProtocolsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/user-permissions" element={<UserPermissionsPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/my-certificates" element={<MyCertificatesPage />} />
            <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
            <Route path="/my-protocols" element={<MyProtocolsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
