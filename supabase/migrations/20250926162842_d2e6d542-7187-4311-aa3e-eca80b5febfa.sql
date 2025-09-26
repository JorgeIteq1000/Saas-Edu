-- Corrigir problema com número de matrícula duplicado
-- Criar função para gerar números de matrícula únicos
CREATE OR REPLACE FUNCTION public.generate_enrollment_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  enrollment_num text;
BEGIN
  year_suffix := EXTRACT(year FROM now())::text;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(enrollment_number FROM '^(\d+)-' || year_suffix || '$') AS integer)
  ), 0) + 1
  INTO sequence_num
  FROM enrollments
  WHERE enrollment_number ~ ('^\d+-' || year_suffix || '$');
  
  enrollment_num := LPAD(sequence_num::text, 6, '0') || '-' || year_suffix;
  
  RETURN enrollment_num;
END;
$$;

-- Criar trigger para definir número de matrícula automaticamente
CREATE OR REPLACE FUNCTION public.set_enrollment_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.enrollment_number IS NULL OR NEW.enrollment_number = '' THEN
    NEW.enrollment_number := generate_enrollment_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Adicionar trigger na tabela enrollments
CREATE TRIGGER set_enrollment_number_trigger
BEFORE INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.set_enrollment_number();