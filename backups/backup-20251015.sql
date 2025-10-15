


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."course_modality" AS ENUM (
    'ead',
    'presencial',
    'hibrido'
);


ALTER TYPE "public"."course_modality" OWNER TO "postgres";


CREATE TYPE "public"."course_type" AS ENUM (
    'graduacao',
    'pos_graduacao',
    'especializacao',
    'extensao',
    'tecnico',
    'livre'
);


ALTER TYPE "public"."course_type" OWNER TO "postgres";


CREATE TYPE "public"."enrollment_status" AS ENUM (
    'pendente',
    'ativa',
    'trancada',
    'cancelada',
    'concluida'
);


ALTER TYPE "public"."enrollment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pendente',
    'pago',
    'vencido',
    'cancelado'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin_geral',
    'gestor',
    'vendedor',
    'colaborador',
    'aluno'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile_correct"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_role" "text", "p_phone" "text", "p_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    user_id, 
    full_name, 
    email, 
    role, 
    phone, 
    active
  ) VALUES (
    gen_random_uuid(),  -- Gera UUID único para o perfil
    p_user_id,          -- ID do usuário do Auth
    p_full_name, 
    p_email, 
    p_role::user_role,
    p_phone, 
    p_active
  );
END;
$$;


ALTER FUNCTION "public"."create_user_profile_correct"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_role" "text", "p_phone" "text", "p_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_enrollment_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."generate_enrollment_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_protocol_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."generate_protocol_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_managers"() RETURNS TABLE("user_id" "uuid", "full_name" "text")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT user_id, full_name FROM public.profiles WHERE role = 'gestor';
$$;


ALTER FUNCTION "public"."get_all_managers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_documents_with_details"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "enrollment_id" "uuid", "document_type" "text", "status" "text", "file_path" "text", "rejection_reason" "text", "uploaded_at" timestamp with time zone, "updated_at" timestamp with time zone, "reviewer_id" "uuid", "student_full_name" "text", "student_email" "text", "student_document_number" "text", "reviewer_full_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.user_id,
        d.enrollment_id,
        d.document_type,
        d.status,
        d.file_path,
        d.rejection_reason,
        d.uploaded_at,
        d.updated_at,
        d.reviewer_id,
        student_profile.full_name,
        student_profile.email,
        student_profile.document_number, -- <<< CAMPO NOVO ADICIONADO
        reviewer_profile.full_name
    FROM
        public.student_documents AS d
        LEFT JOIN public.profiles AS student_profile ON d.user_id = student_profile.id
        LEFT JOIN public.profiles AS reviewer_profile ON d.reviewer_id = reviewer_profile.id
    ORDER BY
        d.uploaded_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_documents_with_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enrollment_pillars"("p_enrollment_id" "uuid") RETURNS TABLE("finance_paid" bigint, "finance_total" integer, "academic_completed" bigint, "academic_total" bigint, "docs_status" "text", "min_completion_date" "date", "max_completion_date" "date")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_student_id UUID;
    v_course_id UUID;
    v_start_date DATE;
    v_min_duration INT;
    v_max_duration INT;
    v_course_duration INT;
BEGIN
    -- 1. Obter informações básicas da matrícula e do curso
    SELECT
        e.student_id,
        e.course_id,
        e.start_date,
        c.min_duration_months,
        c.max_duration_months,
        c.duration_months
    INTO
        v_student_id,
        v_course_id,
        v_start_date,
        v_min_duration,
        v_max_duration,
        v_course_duration
    FROM
        public.enrollments e
    JOIN
        public.courses c ON e.course_id = c.id
    WHERE
        e.id = p_enrollment_id;

    -- 2. Pilar Financeiro (x/y pagas)
    --    (Lógica simplificada: considera a taxa de matrícula como 1 parcela paga)
    --    (O total é a duração do curso em meses)
    SELECT
        COUNT(*) INTO finance_paid
    FROM
        public.enrollments
    WHERE
        id = p_enrollment_id AND enrollment_fee_status = 'pago'; -- Simplificação
    finance_total := v_course_duration;

    -- 3. Pilar Acadêmico (x/y disciplinas concluídas)
    academic_total := (SELECT COUNT(*) FROM public.course_disciplines WHERE course_id = v_course_id);

    WITH discipline_progress AS (
      SELECT
        cd.discipline_id,
        (SELECT COUNT(*) FROM public.learning_units lu WHERE lu.discipline_id = cd.discipline_id) as total_uas,
        COUNT(sg.id) as completed_uas
      FROM public.course_disciplines cd
      LEFT JOIN public.student_grades sg ON sg.discipline_id = cd.discipline_id
        AND sg.enrollment_id = p_enrollment_id
        AND sg.grade >= 7.0 -- Considera aprovado se a nota for >= 7
      WHERE cd.course_id = v_course_id
      GROUP BY cd.discipline_id
    )
    SELECT
        COUNT(*) INTO academic_completed
    FROM
        discipline_progress
    WHERE
        total_uas > 0 AND total_uas = completed_uas;

    -- 4. Pilar Documentação (Entregue ou Pendente)
    IF EXISTS (
        SELECT 1
        FROM public.documents d
        WHERE d.student_id = v_student_id AND d.status <> 'aprovado'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.documents d
        WHERE d.student_id = v_student_id
    ) THEN
        docs_status := 'Falta documentos';
    ELSE
        docs_status := 'Entregue';
    END IF;

    -- 5. Prazos de conclusão
    IF v_start_date IS NOT NULL THEN
      min_completion_date := v_start_date + (v_min_duration || ' months')::interval;
      max_completion_date := v_start_date + (v_max_duration || ' months')::interval;
    END IF;

    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_enrollment_pillars"("p_enrollment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claim"("claim" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::JSONB -> claim,
    'null'::JSONB
  )
$$;


ALTER FUNCTION "public"."get_my_claim"("claim" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_claims"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::JSONB,
    '{}'::JSONB
  )
$$;


ALTER FUNCTION "public"."get_my_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb->>'role';
$$;


ALTER FUNCTION "public"."get_my_current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_user_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT user_id FROM public.profiles WHERE manager_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_team_user_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_grades_for_enrollment"("p_enrollment_id" "uuid") RETURNS TABLE("discipline_id" "uuid", "discipline_name" "text", "grade" numeric, "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id AS discipline_id,
        d.name AS discipline_name,
        sg.grade,
        sg.updated_at AS last_updated
    FROM
        course_disciplines cd
    JOIN
        disciplines d ON cd.discipline_id = d.id
    LEFT JOIN
        student_grades sg ON sg.discipline_id = d.id
        AND sg.enrollment_id = p_enrollment_id
    WHERE
        cd.course_id = (SELECT course_id FROM enrollments WHERE id = p_enrollment_id);
END;
$$;


ALTER FUNCTION "public"."get_student_grades_for_enrollment"("p_enrollment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_uuid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;


ALTER FUNCTION "public"."get_user_role"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_id"("user_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT team_id FROM public.profiles WHERE user_id = user_uuid;
$$;


ALTER FUNCTION "public"."get_user_team_id"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    phone, 
    active
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    new.email,
    COALESCE(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'aluno'::public.user_role
    ),
    new.raw_user_meta_data->>'phone',
    COALESCE(
      (new.raw_user_meta_data->>'active')::boolean,
      true
    )
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Se der erro no trigger, não impede a criação do usuário no auth
    RAISE NOTICE 'Erro no trigger handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_service_role"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('role') = 'service_role';
END;
$$;


ALTER FUNCTION "public"."is_service_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_member"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $_$
  select exists (
    select 1 from public.profiles
    -- A CORREÇÃO FINAL ESTÁ AQUI:
    where profiles.user_id = $1 -- Usando $1 para se referir ao primeiro parâmetro (user_id) de forma inequívoca.
    and profiles.role in ('admin_geral', 'gestor', 'colaborador')
  );
$_$;


ALTER FUNCTION "public"."is_team_member"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_document"("doc_id" "uuid", "new_status" "text", "reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  reviewer_profile_id uuid;
BEGIN
    -- Etapa 1: Verificação de permissão (já estava correta)
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin_geral', 'gestor', 'colaborador')
    ) THEN
        RAISE EXCEPTION 'Permissão negada para revisar documentos.';
    END IF;

    -- Etapa 2: Buscar o ID do perfil do revisor (a correção crucial)
    SELECT id INTO reviewer_profile_id
    FROM public.profiles
    WHERE user_id = auth.uid();

    -- Etapa 3: Executa a atualização usando o ID do perfil correto
    UPDATE public.student_documents
    SET
        status = new_status,
        rejection_reason = reason,
        reviewer_id = reviewer_profile_id, -- Usando a variável correta
        updated_at = now()
    WHERE id = doc_id;
END;
$$;


ALTER FUNCTION "public"."review_document"("doc_id" "uuid", "new_status" "text", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_enrollment_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.enrollment_number IS NULL OR NEW.enrollment_number = '' THEN
    NEW.enrollment_number := generate_enrollment_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_enrollment_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_protocol_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.protocol_number IS NULL OR NEW.protocol_number = '' THEN
    NEW.protocol_number := generate_protocol_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_protocol_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "target_audience" "text" DEFAULT 'geral'::"text" NOT NULL,
    "target_course_id" "uuid",
    "has_action_button" boolean DEFAULT false NOT NULL,
    "action_button_text" "text",
    "action_button_url" "text",
    "is_indefinite" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificate_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "certificate_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certificate_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificate_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "course_type" "public"."course_type" NOT NULL,
    "certifying_institution" "text" NOT NULL,
    "layout_url" "text",
    "html_content" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certificate_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certifying_institutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cnpj" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "address" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certifying_institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."combo_course_types" (
    "combo_id" "uuid" NOT NULL,
    "course_type_id" "uuid" NOT NULL
);


ALTER TABLE "public"."combo_course_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."combo_course_types" IS 'Tabela pivot para associar TIPOS de curso a combos.';



CREATE TABLE IF NOT EXISTS "public"."combos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."combos" OWNER TO "postgres";


COMMENT ON TABLE "public"."combos" IS 'Armazena os pacotes de cursos (combos)';



COMMENT ON COLUMN "public"."combos"."name" IS 'Nome do combo, ex: Pós + 2ª Licenciatura';



COMMENT ON COLUMN "public"."combos"."price" IS 'Preço total do combo';



COMMENT ON COLUMN "public"."combos"."is_active" IS 'Indica se o combo está disponível para venda';



CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "course_type_id" "uuid" NOT NULL,
    "certifying_institution_id" "uuid" NOT NULL,
    "contract_content" "text" NOT NULL,
    "terms_and_conditions" "text",
    "version" "text" DEFAULT '1.0'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_disciplines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "discipline_id" "uuid" NOT NULL
);


ALTER TABLE "public"."course_disciplines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "required_documents" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."course_types" OWNER TO "postgres";


COMMENT ON COLUMN "public"."course_types"."required_documents" IS 'Armazena a lista de documentos obrigatórios para a matrícula no tipo de curso.';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "description" "text",
    "modality" "public"."course_modality" NOT NULL,
    "duration_months" integer NOT NULL,
    "workload_hours" integer NOT NULL,
    "min_duration_months" integer,
    "max_duration_months" integer,
    "sagah_disciplines_code" "text",
    "enrollment_fee" numeric(10,2) DEFAULT 0,
    "monthly_fee" numeric(10,2) DEFAULT 0,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "course_type_id" "uuid",
    "certifying_institution_id" "uuid",
    "max_installments" integer DEFAULT 12 NOT NULL,
    "payment_methods" "text"[] DEFAULT ARRAY['boleto'::"text", 'pix'::"text", 'cartao_de_credito'::"text"] NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disciplines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "workload_hours" integer NOT NULL,
    "recovery_attempts" integer DEFAULT 1 NOT NULL,
    "teacher_id" "uuid"
);


ALTER TABLE "public"."disciplines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "document_name" "text" NOT NULL,
    "document_url" "text" NOT NULL,
    "status" "text" DEFAULT 'em_analise'::"text" NOT NULL,
    "reviewer_id" "uuid",
    "reviewer_notes" "text",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollment_occurrences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb",
    "image_url" "text"
);


ALTER TABLE "public"."enrollment_occurrences" OWNER TO "postgres";


COMMENT ON TABLE "public"."enrollment_occurrences" IS 'Registra eventos e anotações importantes sobre a matrícula de um aluno em um curso.';



COMMENT ON COLUMN "public"."enrollment_occurrences"."created_by" IS 'Perfil do colaborador que criou o registro. Nulo se for automático.';



COMMENT ON COLUMN "public"."enrollment_occurrences"."metadata" IS 'Dados estruturados para ocorrências automáticas.';



COMMENT ON COLUMN "public"."enrollment_occurrences"."image_url" IS 'URL da imagem de anexo para a ocorrência.';



CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "seller_id" "uuid",
    "enrollment_number" "text" NOT NULL,
    "status" "public"."enrollment_status" DEFAULT 'pendente'::"public"."enrollment_status" NOT NULL,
    "enrollment_fee_status" "public"."payment_status" DEFAULT 'pendente'::"public"."payment_status" NOT NULL,
    "enrollment_date" timestamp with time zone,
    "start_date" timestamp with time zone,
    "expected_end_date" timestamp with time zone,
    "actual_end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "combo_id" "uuid",
    "package_id" "uuid"
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."enrollments"."combo_id" IS 'Referência ao combo no qual o aluno foi matriculado';



COMMENT ON COLUMN "public"."enrollments"."package_id" IS 'Agrupa múltiplas matrículas que foram compradas juntas em um combo/pacote.';



CREATE TABLE IF NOT EXISTS "public"."learning_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "sagah_content_id" "text" NOT NULL,
    "discipline_id" "uuid" NOT NULL
);


ALTER TABLE "public"."learning_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_name" "text" NOT NULL,
    "can_view" boolean DEFAULT false NOT NULL,
    "can_create" boolean DEFAULT false NOT NULL,
    "can_edit" boolean DEFAULT false NOT NULL,
    "can_delete" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "document_number" "text",
    "role" "public"."user_role" DEFAULT 'aluno'::"public"."user_role" NOT NULL,
    "team_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "birth_date" "date",
    "gender" "text",
    "rg" "text",
    "rg_issuer" "text",
    "address_street" "text",
    "address_number" "text",
    "address_complement" "text",
    "address_neighborhood" "text",
    "address_city" "text",
    "address_state" "text",
    "address_zip_code" "text",
    "father_name" "text",
    "mother_name" "text",
    "birth_country" "text",
    "birth_state" "text",
    "birth_city" "text",
    "previous_institution" "text",
    "previous_course" "text",
    "education_level" "text",
    "graduation_date" "date",
    "manager_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."manager_id" IS 'ID do gestor (da tabela auth.users) ao qual este usuário está vinculado.';



CREATE TABLE IF NOT EXISTS "public"."protocol_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "protocol_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."protocol_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."protocols" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "protocol_number" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "student_id" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "department" "text" DEFAULT 'geral'::"text" NOT NULL,
    "status" "text" DEFAULT 'aberto'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."protocols" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "referred_by_student_id" "uuid" NOT NULL,
    "referred_name" "text" NOT NULL,
    "referred_phone" "text" NOT NULL,
    "interested_course_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'nova'::"text" NOT NULL,
    "assigned_to_rep_id" "uuid",
    "admin_notes" "text"
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."required_documents" (
    "course_type_id" "uuid" NOT NULL,
    "document_config_id" "uuid" NOT NULL
);


ALTER TABLE "public"."required_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "student_id" "uuid",
    "course_id" "uuid" NOT NULL,
    "enrollment_id" "uuid",
    "status" "text" DEFAULT 'lead'::"text" NOT NULL,
    "notes" "text",
    "value" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."student_activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "file_path" "text",
    "rejection_reason" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reviewer_id" "uuid"
);


ALTER TABLE "public"."student_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_documents" IS 'Armazena os documentos enviados pelos alunos, seu status e o caminho do arquivo.';



CREATE TABLE IF NOT EXISTS "public"."student_grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "discipline_id" "uuid" NOT NULL,
    "learning_unit_id" "uuid" NOT NULL,
    "grade" numeric(4,2),
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "provider" "text",
    CONSTRAINT "student_grades_grade_check" CHECK ((("grade" >= 0.00) AND ("grade" <= 10.00)))
);


ALTER TABLE "public"."student_grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tabela_teste" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tabela_teste" OWNER TO "postgres";


ALTER TABLE "public"."tabela_teste" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tabela_teste_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text" NOT NULL,
    "titulation" "text" NOT NULL
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "cnpj" "text",
    "manager_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificate_requests"
    ADD CONSTRAINT "certificate_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificate_templates"
    ADD CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certifying_institutions"
    ADD CONSTRAINT "certifying_institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."combo_course_types"
    ADD CONSTRAINT "combo_course_types_pkey" PRIMARY KEY ("combo_id", "course_type_id");



ALTER TABLE ONLY "public"."combos"
    ADD CONSTRAINT "combos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_disciplines"
    ADD CONSTRAINT "course_disciplines_course_id_discipline_id_key" UNIQUE ("course_id", "discipline_id");



ALTER TABLE ONLY "public"."course_disciplines"
    ADD CONSTRAINT "course_disciplines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_types"
    ADD CONSTRAINT "course_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."course_types"
    ADD CONSTRAINT "course_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_configs"
    ADD CONSTRAINT "document_configs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."document_configs"
    ADD CONSTRAINT "document_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollment_occurrences"
    ADD CONSTRAINT "enrollment_occurrences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_enrollment_number_key" UNIQUE ("enrollment_number");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_course_id_key" UNIQUE ("student_id", "course_id");



ALTER TABLE ONLY "public"."learning_units"
    ADD CONSTRAINT "learning_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_user_id_module_name_key" UNIQUE ("user_id", "module_name");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."protocol_messages"
    ADD CONSTRAINT "protocol_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."protocols"
    ADD CONSTRAINT "protocols_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."protocols"
    ADD CONSTRAINT "protocols_protocol_number_key" UNIQUE ("protocol_number");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."required_documents"
    ADD CONSTRAINT "required_documents_pkey" PRIMARY KEY ("course_type_id", "document_config_id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_pkey" PRIMARY KEY ("enrollment_id", "learning_unit_id", "student_id");



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_student_id_learning_unit_id_attempt_number_key" UNIQUE ("student_id", "learning_unit_id", "attempt_number");



ALTER TABLE ONLY "public"."tabela_teste"
    ADD CONSTRAINT "tabela_teste_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "unique_user_enrollment_document" UNIQUE ("user_id", "enrollment_id", "document_type");



CREATE INDEX "idx_student_activity_logs_actor_id" ON "public"."student_activity_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_student_activity_logs_student_id" ON "public"."student_activity_logs" USING "btree" ("student_id");



CREATE INDEX "idx_student_documents_user_id" ON "public"."student_documents" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "set_enrollment_number_trigger" BEFORE INSERT ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."set_enrollment_number"();



CREATE OR REPLACE TRIGGER "trigger_set_protocol_number" BEFORE INSERT ON "public"."protocols" FOR EACH ROW EXECUTE FUNCTION "public"."set_protocol_number"();



CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_certificate_requests_updated_at" BEFORE UPDATE ON "public"."certificate_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_certificate_templates_updated_at" BEFORE UPDATE ON "public"."certificate_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_certifying_institutions_updated_at" BEFORE UPDATE ON "public"."certifying_institutions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_course_types_updated_at" BEFORE UPDATE ON "public"."course_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_enrollments_updated_at" BEFORE UPDATE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_protocols_updated_at" BEFORE UPDATE ON "public"."protocols" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_target_course_id_fkey" FOREIGN KEY ("target_course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."combo_course_types"
    ADD CONSTRAINT "combo_course_types_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combo_course_types"
    ADD CONSTRAINT "combo_course_types_course_type_id_fkey" FOREIGN KEY ("course_type_id") REFERENCES "public"."course_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_certifying_institution_id_fkey" FOREIGN KEY ("certifying_institution_id") REFERENCES "public"."certifying_institutions"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_course_type_id_fkey" FOREIGN KEY ("course_type_id") REFERENCES "public"."course_types"("id");



ALTER TABLE ONLY "public"."course_disciplines"
    ADD CONSTRAINT "course_disciplines_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_disciplines"
    ADD CONSTRAINT "course_disciplines_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disciplines"
    ADD CONSTRAINT "disciplines_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."enrollment_occurrences"
    ADD CONSTRAINT "enrollment_occurrences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollment_occurrences"
    ADD CONSTRAINT "enrollment_occurrences_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."combos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "fk_courses_certifying_institution" FOREIGN KEY ("certifying_institution_id") REFERENCES "public"."certifying_institutions"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "fk_courses_course_type" FOREIGN KEY ("course_type_id") REFERENCES "public"."course_types"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "fk_profiles_team" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "fk_teams_manager" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."learning_units"
    ADD CONSTRAINT "learning_units_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."protocol_messages"
    ADD CONSTRAINT "protocol_messages_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."protocol_messages"
    ADD CONSTRAINT "protocol_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."protocols"
    ADD CONSTRAINT "protocols_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."protocols"
    ADD CONSTRAINT "protocols_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_assigned_to_rep_id_fkey" FOREIGN KEY ("assigned_to_rep_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_interested_course_id_fkey" FOREIGN KEY ("interested_course_id") REFERENCES "public"."courses"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_by_student_id_fkey" FOREIGN KEY ("referred_by_student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."required_documents"
    ADD CONSTRAINT "required_documents_course_type_id_fkey" FOREIGN KEY ("course_type_id") REFERENCES "public"."course_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."required_documents"
    ADD CONSTRAINT "required_documents_document_config_id_fkey" FOREIGN KEY ("document_config_id") REFERENCES "public"."document_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_documents"
    ADD CONSTRAINT "student_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_learning_unit_id_fkey" FOREIGN KEY ("learning_unit_id") REFERENCES "public"."learning_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_grades"
    ADD CONSTRAINT "student_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can manage all announcements" ON "public"."announcements" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all certificate requests" ON "public"."certificate_requests" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all documents" ON "public"."documents" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all permissions" ON "public"."permissions" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all profiles" ON "public"."profiles" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all protocols" ON "public"."protocols" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all sales" ON "public"."sales" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage all teams" ON "public"."teams" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage certificate templates" ON "public"."certificate_templates" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage contracts" ON "public"."contracts" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage course types" ON "public"."course_types" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage courses" ON "public"."courses" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage enrollments" ON "public"."enrollments" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can manage institutions" ON "public"."certifying_institutions" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all enrollments" ON "public"."enrollments" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all permissions" ON "public"."permissions" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all profiles" ON "public"."profiles" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all protocol messages" ON "public"."protocol_messages" USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all sales" ON "public"."sales" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admin can view all teams" ON "public"."teams" FOR SELECT USING (("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role"));



CREATE POLICY "Admins and Managers can manage all grades." ON "public"."student_grades" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Admins and Managers can manage all referrals." ON "public"."referrals" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Admins and managers can view all activity logs." ON "public"."student_activity_logs" FOR SELECT USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role", 'vendedor'::"public"."user_role"])));



CREATE POLICY "Allow admin full access to announcements" ON "public"."announcements" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"]))) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin full access to combo_course_types" ON "public"."combo_course_types" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"]))) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin full access to combos" ON "public"."combos" TO "authenticated" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"]))) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin/manager full access" ON "public"."disciplines" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin/manager full access for course disciplines" ON "public"."course_disciplines" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin/manager full access for learning units" ON "public"."learning_units" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow admin/manager full access for teachers" ON "public"."teachers" USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())) = ANY (ARRAY['admin_geral'::"public"."user_role", 'gestor'::"public"."user_role"])));



CREATE POLICY "Allow authenticated read access" ON "public"."disciplines" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access for course disciplines" ON "public"."course_disciplines" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access for learning units" ON "public"."learning_units" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access for teachers" ON "public"."teachers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access to combo_course_types" ON "public"."combo_course_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read access to combos" ON "public"."combos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read access to document configs" ON "public"."document_configs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read access to required documents" ON "public"."required_documents" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read course_types" ON "public"."course_types" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read course_types" ON "public"."course_types" IS 'Permite que qualquer usuário logado leia os dados dos tipos de curso.';



CREATE POLICY "Allow authenticated users to read courses" ON "public"."courses" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "Allow authenticated users to read courses" ON "public"."courses" IS 'Permite que qualquer usuário logado leia os dados dos cursos.';



CREATE POLICY "Allow staff to manage document configs" ON "public"."document_configs" USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = ANY (ARRAY['admin_geral'::"public"."user_role", 'colaborador'::"public"."user_role"])))));



CREATE POLICY "Allow staff to manage required documents" ON "public"."required_documents" USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = ANY (ARRAY['admin_geral'::"public"."user_role", 'colaborador'::"public"."user_role"])))));



CREATE POLICY "Allow student to insert their own documents" ON "public"."student_documents" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "student_documents"."user_id")) = "auth"."uid"()));



COMMENT ON POLICY "Allow student to insert their own documents" ON "public"."student_documents" IS 'Permite que um aluno insira documentos se o profile_id corresponder ao seu auth.uid via sub-select.';



CREATE POLICY "Allow student to read their own documents" ON "public"."student_documents" FOR SELECT TO "authenticated" USING ((( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "student_documents"."user_id")) = "auth"."uid"()));



CREATE POLICY "Allow student to read their own enrollments" ON "public"."enrollments" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "student_id"));



COMMENT ON POLICY "Allow student to read their own enrollments" ON "public"."enrollments" IS 'Permite que um aluno (usuário autenticado) leia apenas as suas próprias matrículas.';



CREATE POLICY "Allow student to update their own documents" ON "public"."student_documents" FOR UPDATE TO "authenticated" USING ((( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "student_documents"."user_id")) = "auth"."uid"()));



CREATE POLICY "Allow students to read their own enrollments" ON "public"."enrollments" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Allow users to view relevant announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING ((("active" = true) AND (("is_indefinite" = true) OR ("expires_at" >= "now"())) AND (("target_audience" = 'geral'::"text") OR ("target_audience" = (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))::"text"))));



CREATE POLICY "Announcement managers can manage announcements" ON "public"."announcements" USING ((EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."profiles" "pr" ON (("p"."user_id" = "pr"."id")))
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'announcements'::"text") AND (("p"."can_view" = true) OR ("p"."can_edit" = true))))));



CREATE POLICY "Assigned users can view assigned protocols" ON "public"."protocols" FOR SELECT USING (("assigned_to" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Authenticated users can insert logs." ON "public"."student_activity_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Certificate staff can manage requests" ON "public"."certificate_requests" USING ((EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."profiles" "pr" ON (("p"."user_id" = "pr"."id")))
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'certificates'::"text") AND (("p"."can_view" = true) OR ("p"."can_edit" = true))))));



CREATE POLICY "Certificate staff can view templates" ON "public"."certificate_templates" FOR SELECT USING ((("public"."get_user_role"("auth"."uid"()) = 'admin_geral'::"public"."user_role") OR (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."profiles" "pr" ON (("p"."user_id" = "pr"."id")))
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'certificates'::"text") AND ("p"."can_view" = true))))));



CREATE POLICY "Document reviewers can manage documents" ON "public"."documents" USING ((EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."profiles" "pr" ON (("p"."user_id" = "pr"."id")))
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'documents'::"text") AND (("p"."can_view" = true) OR ("p"."can_edit" = true))))));



CREATE POLICY "Everyone can view active contracts" ON "public"."contracts" FOR SELECT USING (("active" = true));



CREATE POLICY "Everyone can view active course types" ON "public"."course_types" FOR SELECT USING (("active" = true));



CREATE POLICY "Everyone can view active courses" ON "public"."courses" FOR SELECT USING (("active" = true));



CREATE POLICY "Everyone can view active institutions" ON "public"."certifying_institutions" FOR SELECT USING (("active" = true));



CREATE POLICY "Managers can view their own team" ON "public"."teams" FOR SELECT USING ((("id" = "public"."get_user_team_id"("auth"."uid"())) OR ("manager_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view their team members profiles" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("public"."get_user_role"("auth"."uid"()) = 'gestor'::"public"."user_role") AND ("manager_id" = "auth"."uid"()))));



CREATE POLICY "Permitir inserção para admin e colaborador" ON "public"."enrollment_occurrences" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = ANY (ARRAY['admin_geral'::"public"."user_role", 'colaborador'::"public"."user_role"])))));



CREATE POLICY "Permitir visualização para admin e colaborador" ON "public"."enrollment_occurrences" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = ANY (ARRAY['admin_geral'::"public"."user_role", 'colaborador'::"public"."user_role"])))));



CREATE POLICY "Protocol participants can create messages" ON "public"."protocol_messages" FOR INSERT WITH CHECK ((("protocol_id" IN ( SELECT "p"."id"
   FROM "public"."protocols" "p"
  WHERE (("p"."student_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("p"."assigned_to" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
           FROM ("public"."permissions" "pe"
             JOIN "public"."profiles" "pr" ON (("pe"."user_id" = "pr"."id")))
          WHERE (("pr"."user_id" = "auth"."uid"()) AND ("pe"."module_name" = 'protocols'::"text") AND ("pe"."can_edit" = true))))))) AND ("sender_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Protocol participants can view messages" ON "public"."protocol_messages" FOR SELECT USING ((("protocol_id" IN ( SELECT "p"."id"
   FROM "public"."protocols" "p"
  WHERE (("p"."student_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("p"."assigned_to" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
           FROM ("public"."permissions" "pe"
             JOIN "public"."profiles" "pr" ON (("pe"."user_id" = "pr"."id")))
          WHERE (("pr"."user_id" = "auth"."uid"()) AND ("pe"."module_name" = 'protocols'::"text") AND ("pe"."can_view" = true))))))) AND ((NOT "is_internal") OR ("sender_id" <> ( SELECT "p"."student_id"
   FROM "public"."protocols" "p"
  WHERE ("p"."id" = "protocol_messages"."protocol_id"))))));



CREATE POLICY "Protocol staff can manage protocols" ON "public"."protocols" USING ((EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."profiles" "pr" ON (("p"."user_id" = "pr"."id")))
  WHERE (("pr"."user_id" = "auth"."uid"()) AND ("p"."module_name" = 'protocols'::"text") AND (("p"."can_view" = true) OR ("p"."can_edit" = true))))));



CREATE POLICY "Sales team can view relevant enrollments" ON "public"."enrollments" FOR SELECT USING ((("seller_id" = "auth"."uid"()) OR (("public"."get_user_role"("auth"."uid"()) = 'gestor'::"public"."user_role") AND ("seller_id" IN ( SELECT "get_my_team_user_ids"."get_my_team_user_ids"
   FROM "public"."get_my_team_user_ids"() "get_my_team_user_ids"("get_my_team_user_ids"))))));



CREATE POLICY "Sellers can manage their own sales" ON "public"."sales" USING (("seller_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Sellers can view their own sales" ON "public"."sales" FOR SELECT USING (("seller_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Service role can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK ("public"."is_service_role"());



CREATE POLICY "Service role can update profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_service_role"());



CREATE POLICY "Students can create protocols" ON "public"."protocols" FOR INSERT WITH CHECK (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can create their own documents" ON "public"."documents" FOR INSERT WITH CHECK (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can create their own referrals." ON "public"."referrals" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "referrals"."referred_by_student_id"))));



CREATE POLICY "Students can create their own requests" ON "public"."certificate_requests" FOR INSERT WITH CHECK (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can view their own activity logs." ON "public"."student_activity_logs" FOR SELECT USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "student_activity_logs"."student_id"))));



CREATE POLICY "Students can view their own documents" ON "public"."documents" FOR SELECT USING (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can view their own enrollments" ON "public"."enrollments" FOR SELECT USING (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can view their own grades." ON "public"."student_grades" FOR SELECT USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "student_grades"."student_id"))));



CREATE POLICY "Students can view their own protocols" ON "public"."protocols" FOR SELECT USING (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can view their own referrals." ON "public"."referrals" FOR SELECT USING (("auth"."uid"() = ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "referrals"."referred_by_student_id"))));



CREATE POLICY "Students can view their own requests" ON "public"."certificate_requests" FOR SELECT USING (("student_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students have full access to their own documents" ON "public"."student_documents" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Team can read all documents" ON "public"."student_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin_geral'::"public"."user_role", 'colaborador'::"public"."user_role"]))))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own permissions" ON "public"."permissions" FOR SELECT USING (("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificate_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificate_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certifying_institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."combo_course_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."combos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disciplines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollment_occurrences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."protocol_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."protocols" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."required_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_grades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tabela_teste" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_user_profile_correct"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_role" "text", "p_phone" "text", "p_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile_correct"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_role" "text", "p_phone" "text", "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile_correct"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_role" "text", "p_phone" "text", "p_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_enrollment_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_enrollment_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_enrollment_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_protocol_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_protocol_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_protocol_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_managers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_managers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_managers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_documents_with_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_documents_with_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_documents_with_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enrollment_pillars"("p_enrollment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enrollment_pillars"("p_enrollment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enrollment_pillars"("p_enrollment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claim"("claim" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_claims"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_team_user_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_team_user_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_user_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_grades_for_enrollment"("p_enrollment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_grades_for_enrollment"("p_enrollment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_grades_for_enrollment"("p_enrollment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_id"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_id"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_id"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_service_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."review_document"("doc_id" "uuid", "new_status" "text", "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."review_document"("doc_id" "uuid", "new_status" "text", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_document"("doc_id" "uuid", "new_status" "text", "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_enrollment_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_enrollment_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_enrollment_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_protocol_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_protocol_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_protocol_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_requests" TO "anon";
GRANT ALL ON TABLE "public"."certificate_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_requests" TO "service_role";



GRANT ALL ON TABLE "public"."certificate_templates" TO "anon";
GRANT ALL ON TABLE "public"."certificate_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificate_templates" TO "service_role";



GRANT ALL ON TABLE "public"."certifying_institutions" TO "anon";
GRANT ALL ON TABLE "public"."certifying_institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."certifying_institutions" TO "service_role";



GRANT ALL ON TABLE "public"."combo_course_types" TO "anon";
GRANT ALL ON TABLE "public"."combo_course_types" TO "authenticated";
GRANT ALL ON TABLE "public"."combo_course_types" TO "service_role";



GRANT ALL ON TABLE "public"."combos" TO "anon";
GRANT ALL ON TABLE "public"."combos" TO "authenticated";
GRANT ALL ON TABLE "public"."combos" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."course_disciplines" TO "anon";
GRANT ALL ON TABLE "public"."course_disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."course_disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."course_types" TO "anon";
GRANT ALL ON TABLE "public"."course_types" TO "authenticated";
GRANT ALL ON TABLE "public"."course_types" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."disciplines" TO "anon";
GRANT ALL ON TABLE "public"."disciplines" TO "authenticated";
GRANT ALL ON TABLE "public"."disciplines" TO "service_role";



GRANT ALL ON TABLE "public"."document_configs" TO "anon";
GRANT ALL ON TABLE "public"."document_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."document_configs" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."enrollment_occurrences" TO "anon";
GRANT ALL ON TABLE "public"."enrollment_occurrences" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollment_occurrences" TO "service_role";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."learning_units" TO "anon";
GRANT ALL ON TABLE "public"."learning_units" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_units" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."protocol_messages" TO "anon";
GRANT ALL ON TABLE "public"."protocol_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."protocol_messages" TO "service_role";



GRANT ALL ON TABLE "public"."protocols" TO "anon";
GRANT ALL ON TABLE "public"."protocols" TO "authenticated";
GRANT ALL ON TABLE "public"."protocols" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."required_documents" TO "anon";
GRANT ALL ON TABLE "public"."required_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."required_documents" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."student_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."student_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."student_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."student_documents" TO "anon";
GRANT ALL ON TABLE "public"."student_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."student_documents" TO "service_role";



GRANT ALL ON TABLE "public"."student_grades" TO "anon";
GRANT ALL ON TABLE "public"."student_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."student_grades" TO "service_role";



GRANT ALL ON TABLE "public"."tabela_teste" TO "anon";
GRANT ALL ON TABLE "public"."tabela_teste" TO "authenticated";
GRANT ALL ON TABLE "public"."tabela_teste" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tabela_teste_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tabela_teste_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tabela_teste_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




























RESET ALL;
