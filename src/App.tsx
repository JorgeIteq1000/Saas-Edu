import EnrollmentCourseDetailsPage from './pages/EnrollmentCourseDetailsPage';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";

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
import MyReferralsPage from "./pages/MyReferralsPage";
import ReferralsPage from "./pages/ReferralsPage";
import UserPermissionsPage from "./pages/UserPermissionsPage";
import CoursePortalPage from "./pages/CoursePortalPage";
import MyCourseDisciplinesPage from "./pages/MyCourseDisciplinesPage";
import CombosPage from './pages/CombosPage';
import MyDocumentsPage from './pages/MyDocumentsPage';
import EnrollPage from './pages/EnrollPage';
import MySalesPage from './pages/MySalesPage'; // ✅ IMPORTAÇÃO ADICIONADA: Página de Minhas Vendas

const queryClient = new QueryClient();

const App: React.FC = () => {
  console.log("✅ App component renderizando...");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router>
          {/* CORREÇÃO APLICADA AQUI: SidebarProvider garante que o contexto esteja disponível */}
          <SidebarProvider>
            <AppLayout>
              <Routes>
                {/* Rotas de Autenticação e Dashboard */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<Dashboard />} />
                
                {/* Rotas de Gestão */}
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
                <Route path="/referrals" element={<ReferralsPage />} />
                <Route path="/user-permissions" element={<UserPermissionsPage />} />
                <Route path="/combos" element={<CombosPage />} />

                {/* Rotas de Vendedor/Gestor/Aluno (Páginas "Minhas") */}
                <Route path="/my-sales" element={<MySalesPage />} /> {/* ✅ NOVA ROTA PARA MINHAS VENDAS */}
                <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
                <Route path="/my-protocols" element={<MyProtocolsPage />} />
                <Route path="/my-certificates" element={<MyCertificatesPage />} />
                <Route path="/my-data" element={<MyDataPage />} />
                <Route path="/my-referrals" element={<MyReferralsPage />} />
                <Route path="/my-documents" element={<MyDocumentsPage />} />
                
                {/* Rotas de Aluno Específicas */}
                <Route path="/curso/:enrollmentId" element={<CoursePortalPage />} />
                <Route path="/curso/:enrollmentId/disciplinas" element={<MyCourseDisciplinesPage />} />
                <Route path="/matricula-curso/:enrollmentId" element={<EnrollmentCourseDetailsPage />} />
                
                {/* Outras Rotas */}
                <Route path="/matricular" element={<EnrollPage />} />
              </Routes>
            </AppLayout>
          </SidebarProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
