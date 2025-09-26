-- Create certificate templates table
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course_type course_type NOT NULL,
  certifying_institution TEXT NOT NULL,
  layout_url TEXT,
  html_content TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificate requests table
CREATE TABLE public.certificate_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  template_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_requests ENABLE ROW LEVEL SECURITY;

-- Certificate templates policies
CREATE POLICY "Admin can manage certificate templates" 
ON public.certificate_templates 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin_geral'::user_role);

CREATE POLICY "Certificate staff can view templates" 
ON public.certificate_templates 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'admin_geral'::user_role OR
  EXISTS (
    SELECT 1 FROM permissions p 
    JOIN profiles pr ON p.user_id = pr.id 
    WHERE pr.user_id = auth.uid() 
    AND p.module_name = 'certificates' 
    AND p.can_view = true
  )
);

-- Certificate requests policies
CREATE POLICY "Admin can manage all certificate requests" 
ON public.certificate_requests 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin_geral'::user_role);

CREATE POLICY "Certificate staff can manage requests" 
ON public.certificate_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM permissions p 
    JOIN profiles pr ON p.user_id = pr.id 
    WHERE pr.user_id = auth.uid() 
    AND p.module_name = 'certificates' 
    AND (p.can_view = true OR p.can_edit = true)
  )
);

CREATE POLICY "Students can view their own requests" 
ON public.certificate_requests 
FOR SELECT 
USING (
  student_id = (
    SELECT profiles.id FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Students can create their own requests" 
ON public.certificate_requests 
FOR INSERT 
WITH CHECK (
  student_id = (
    SELECT profiles.id FROM profiles 
    WHERE profiles.user_id = auth.uid()
  )
);

-- Add triggers for timestamps
CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificate_requests_updated_at
BEFORE UPDATE ON public.certificate_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();