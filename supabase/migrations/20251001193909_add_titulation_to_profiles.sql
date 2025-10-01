-- supabase/migrations/YYYYMMDDHHMMSS_add_titulation_to_profiles.sql

-- Adiciona a coluna 'titulation' na tabela de perfis
ALTER TABLE public.profiles
ADD COLUMN titulation text;

-- Adiciona a política de segurança para a nova coluna
-- log: Garante que apenas administradores e gestores possam ver e editar a titulação.
UPDATE "storage"."policies" SET "roles" = array_append("roles", 'admin_geral') WHERE "name" = 'profiles_titulation_select';
UPDATE "storage"."policies" SET "roles" = array_append("roles", 'gestor') WHERE "name" = 'profiles_titulation_select';
UPDATE "storage"."policies" SET "roles" = array_append("roles", 'admin_geral') WHERE "name" = 'profiles_titulation_update';
UPDATE "storage"."policies" SET "roles" = array_append("roles", 'gestor') WHERE "name" = 'profiles_titulation_update';