import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar"; // Importar o SidebarProvider

// Importações de Páginas
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";
import AuthPage from "./components/auth/AuthPage";
import CoursesPage from "./components/courses/CoursesPage";
import UsersPage from "./pages/UsersPage";
import EnrollmentsPage from "./pages/EnrollmentsPage";
import StudentEnrollmentDetailsPage from "./pages/StudentEnrollmentDetailsPage";
import SalesPage from "./pages/SalesPage";
import FinancePage from "./pages/FinancePage";
import ProtocolsPage from "./pages/ProtocolsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import MyEnrollmentsPage from "./pages/MyEnrollmentsPage";
import MyProtocolsPage from "./pages/MyProtocolsPage";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import MyDataPage from "./pages/MyDataPage";
import ContractsPage from "./pages/ContractsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import CertificatesPage from "./pages/CertificatesPage";
import DocumentsPage from "./pages/DocumentsPage";
import MyReferralsPage from "./pages/MyReferralsPage"; // Nova importação
import ReferralsPage from "./pages/ReferralsPage"; // Nova importação
import UserPermissionsPage from "./pages/UserPermissionsPage"; // Nova importação


const queryClient = new QueryClient();

const App: React.FC = () => {
  console.log("✅ App component renderizando...");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router>
          {/* CORREÇÃO APLICADA AQUI */}
          <SidebarProvider>
            <AppLayout>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/enrollments" element={<EnrollmentsPage />} />
                <Route path="/matriculas/:studentId" element={<StudentEnrollmentDetailsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/protocols" element={<ProtocolsPage />} />
                <Route path="/certificates" element={<CertificatesPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* Aluno Rotas */}
                <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
                <Route path="/my-protocols" element={<MyProtocolsPage />} />
                <Route path="/my-certificates" element={<MyCertificatesPage />} />
                <Route path="/my-data" element={<MyDataPage />} />
                <Route path="/my-referrals" element={<MyReferralsPage />} /> {/* Nova Rota */}
                <Route path="/referrals" element={<ReferralsPage />} /> {/* Nova Rota */}
                <Route path="/user-permissions" element={<UserPermissionsPage />} /> {/* Rota Adicionada */}


              </Routes>
            </AppLayout>
          </SidebarProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;