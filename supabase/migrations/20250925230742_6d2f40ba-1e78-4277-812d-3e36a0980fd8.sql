-- Create enum types for the system
CREATE TYPE public.user_role AS ENUM ('admin_geral', 'gestor', 'vendedor', 'colaborador', 'aluno');
CREATE TYPE public.course_type AS ENUM ('graduacao', 'pos_graduacao', 'especializacao', 'extensao');
CREATE TYPE public.course_modality AS ENUM ('ead', 'presencial', 'hibrido');
CREATE TYPE public.enrollment_status AS ENUM ('pendente', 'ativa', 'trancada', 'cancelada', 'concluida');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  document_number TEXT, -- CPF/CNPJ
  role public.user_role NOT NULL DEFAULT 'aluno',
  team_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table for organizational structure
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  manager_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  course_type public.course_type NOT NULL,
  modality public.course_modality NOT NULL,
  duration_months INTEGER NOT NULL,
  workload_hours INTEGER NOT NULL,
  min_duration_months INTEGER,
  max_duration_months INTEGER,
  sagah_disciplines_code TEXT,
  enrollment_fee DECIMAL(10,2) DEFAULT 0,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id),
  enrollment_number TEXT UNIQUE NOT NULL,
  status public.enrollment_status NOT NULL DEFAULT 'pendente',
  enrollment_fee_status public.payment_status NOT NULL DEFAULT 'pendente',
  enrollment_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  expected_end_date TIMESTAMP WITH TIME ZONE,
  actual_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Create sales table for tracking sales process
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id),
  status TEXT NOT NULL DEFAULT 'lead', -- lead, contato, proposta, matricula, perdida
  notes TEXT,
  value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permissions table for dynamic permissions
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL, -- courses, enrollments, sales, etc
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_team_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT team_id FROM public.profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Managers can view team profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'gestor' AND 
    team_id = public.get_user_team_id(auth.uid())
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all profiles" ON public.profiles
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');

-- RLS Policies for courses
CREATE POLICY "Everyone can view active courses" ON public.courses
  FOR SELECT USING (active = true);

CREATE POLICY "Admin can manage courses" ON public.courses
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');

-- RLS Policies for enrollments
CREATE POLICY "Students can view their own enrollments" ON public.enrollments
  FOR SELECT USING (
    student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can view all enrollments" ON public.enrollments
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Sellers can view their own sales enrollments" ON public.enrollments
  FOR SELECT USING (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage enrollments" ON public.enrollments
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');

-- RLS Policies for sales
CREATE POLICY "Sellers can view their own sales" ON public.sales
  FOR SELECT USING (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can view all sales" ON public.sales
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Sellers can manage their own sales" ON public.sales
  FOR ALL USING (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage all sales" ON public.sales
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin_geral');

-- Add foreign key constraint for teams
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_team 
  FOREIGN KEY (team_id) REFERENCES public.teams(id);

ALTER TABLE public.teams ADD CONSTRAINT fk_teams_manager 
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'aluno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();