-- Remove a chave primária antiga da tabela, se ela existir.
-- Isso nos permite criar a nova chave correta sem conflitos.
ALTER TABLE public.student_grades
DROP CONSTRAINT IF EXISTS student_grades_pkey;

-- Define que a combinação de matrícula, unidade de aprendizagem e estudante é ÚNICA.
-- Esta é a regra que faltava para o comando 'ON CONFLICT' funcionar.
ALTER TABLE public.student_grades
ADD PRIMARY KEY (enrollment_id, learning_unit_id, student_id);