-- Adicionar novos campos de dados pessoais à tabela de perfis de usuário
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS rg_issuer TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip_code TEXT,
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS birth_country TEXT,
ADD COLUMN IF NOT EXISTS birth_state TEXT,
ADD COLUMN IF NOT EXISTS birth_city TEXT,
ADD COLUMN IF NOT EXISTS previous_institution TEXT,
ADD COLUMN IF NOT EXISTS previous_course TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT,
ADD COLUMN IF NOT EXISTS graduation_date DATE;

-- Atualizar a política de segurança (RLS) para permitir que o usuário atualize seus próprios dados
-- A política "Users can update their own profile" já existe e cobre esses novos campos.
-- Não é necessário criar uma nova, apenas garantir que ela está ativa.