-- 1. Adiciona a coluna 'attempts' SOMENTE SE ela não existir.
ALTER TABLE public.student_grades
ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 1;

-- 2. Adiciona a coluna 'id' como um UUID SOMENTE SE ela não existir.
ALTER TABLE public.student_grades
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- 3. Remove a chave primária antiga, SOMENTE SE ela existir.
ALTER TABLE public.student_grades
DROP CONSTRAINT IF EXISTS student_grades_pkey;

-- 4. Define a coluna 'id' como a nova chave primária.
-- Isso garante que cada linha de nota seja única.
ALTER TABLE public.student_grades
ADD PRIMARY KEY (id);

-- 5. Cria a regra de unicidade para as tentativas, SOMENTE SE ela não existir.
-- Impede que exista mais de uma "tentativa 1" para o mesmo aluno/UA.
ALTER TABLE public.student_grades
ADD CONSTRAINT unique_attempts UNIQUE (enrollment_id, learning_unit_id, student_id, attempts);