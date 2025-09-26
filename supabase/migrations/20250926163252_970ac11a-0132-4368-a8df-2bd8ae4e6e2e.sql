-- Corrigir problemas de segurança com search_path
ALTER FUNCTION public.generate_protocol_number() SET search_path = public;
ALTER FUNCTION public.set_protocol_number() SET search_path = public;
ALTER FUNCTION public.generate_enrollment_number() SET search_path = public;
ALTER FUNCTION public.set_enrollment_number() SET search_path = public;