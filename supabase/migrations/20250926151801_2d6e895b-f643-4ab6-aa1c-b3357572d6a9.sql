-- Criar tabela para análise de documentos
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  document_type text NOT NULL,
  document_name text NOT NULL,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'em_analise', -- em_analise, aprovado, recusado, divergente
  reviewer_id uuid REFERENCES public.profiles(id),
  reviewer_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos
CREATE POLICY "Admin can manage all documents"
ON public.documents
FOR ALL
USING (get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Document reviewers can manage documents"
ON public.documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM permissions p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE pr.user_id = auth.uid()
    AND p.module_name = 'documents'
    AND (p.can_view = true OR p.can_edit = true)
  )
);

CREATE POLICY "Students can view their own documents"
ON public.documents
FOR SELECT
USING (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create their own documents"
ON public.documents
FOR INSERT
WITH CHECK (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Criar tabela para avisos
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  target_audience text NOT NULL DEFAULT 'geral', -- geral, graduacao, pos_graduacao, especializacao, extensao, curso_especifico
  target_course_id uuid REFERENCES public.courses(id),
  has_action_button boolean NOT NULL DEFAULT false,
  action_button_text text,
  action_button_url text,
  is_indefinite boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para avisos
CREATE POLICY "Admin can manage all announcements"
ON public.announcements
FOR ALL
USING (get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Announcement managers can manage announcements"
ON public.announcements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM permissions p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE pr.user_id = auth.uid()
    AND p.module_name = 'announcements'
    AND (p.can_view = true OR p.can_edit = true)
  )
);

CREATE POLICY "Students can view active announcements"
ON public.announcements
FOR SELECT
USING (
  active = true 
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_audience = 'geral'
    OR EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN profiles p ON e.student_id = p.id
      WHERE p.user_id = auth.uid()
      AND (
        (target_audience = c.course_type::text AND target_course_id IS NULL)
        OR target_course_id = c.id
      )
    )
  )
);

-- Criar tabela para protocolos
CREATE TABLE public.protocols (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  department text NOT NULL DEFAULT 'geral',
  status text NOT NULL DEFAULT 'aberto', -- aberto, em_andamento, transferido, finalizado
  priority text NOT NULL DEFAULT 'normal', -- baixa, normal, alta, urgente
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para protocolos
CREATE POLICY "Admin can manage all protocols"
ON public.protocols
FOR ALL
USING (get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Protocol staff can manage protocols"
ON public.protocols
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM permissions p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE pr.user_id = auth.uid()
    AND p.module_name = 'protocols'
    AND (p.can_view = true OR p.can_edit = true)
  )
);

CREATE POLICY "Students can view their own protocols"
ON public.protocols
FOR SELECT
USING (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can create protocols"
ON public.protocols
FOR INSERT
WITH CHECK (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Assigned users can view assigned protocols"
ON public.protocols
FOR SELECT
USING (assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Criar tabela para mensagens do protocolo
CREATE TABLE public.protocol_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.protocol_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para mensagens de protocolo
CREATE POLICY "Admin can view all protocol messages"
ON public.protocol_messages
FOR ALL
USING (get_user_role(auth.uid()) = 'admin_geral');

CREATE POLICY "Protocol participants can view messages"
ON public.protocol_messages
FOR SELECT
USING (
  protocol_id IN (
    SELECT p.id FROM protocols p
    WHERE p.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR p.assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM permissions pe
      JOIN profiles pr ON pe.user_id = pr.id
      WHERE pr.user_id = auth.uid()
      AND pe.module_name = 'protocols'
      AND pe.can_view = true
    )
  )
  AND (NOT is_internal OR sender_id != (SELECT p.student_id FROM protocols p WHERE p.id = protocol_id))
);

CREATE POLICY "Protocol participants can create messages"
ON public.protocol_messages
FOR INSERT
WITH CHECK (
  protocol_id IN (
    SELECT p.id FROM protocols p
    WHERE p.student_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR p.assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM permissions pe
      JOIN profiles pr ON pe.user_id = pr.id
      WHERE pr.user_id = auth.uid()
      AND pe.module_name = 'protocols'
      AND pe.can_edit = true
    )
  )
  AND sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Função para gerar número de protocolo
CREATE OR REPLACE FUNCTION generate_protocol_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  protocol_num text;
BEGIN
  year_suffix := EXTRACT(year FROM now())::text;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(protocol_number FROM '^(\d+)-' || year_suffix || '$') AS integer)
  ), 0) + 1
  INTO sequence_num
  FROM protocols
  WHERE protocol_number ~ ('^\d+-' || year_suffix || '$');
  
  protocol_num := LPAD(sequence_num::text, 6, '0') || '-' || year_suffix;
  
  RETURN protocol_num;
END;
$$;

-- Trigger para gerar número de protocolo automaticamente
CREATE OR REPLACE FUNCTION set_protocol_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.protocol_number IS NULL OR NEW.protocol_number = '' THEN
    NEW.protocol_number := generate_protocol_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_protocol_number
  BEFORE INSERT ON protocols
  FOR EACH ROW
  EXECUTE FUNCTION set_protocol_number();

-- Triggers para updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();