-- 1. Remove qualquer constraint de unicidade antiga ou incorreta.
ALTER TABLE public.student_grades
DROP CONSTRAINT IF EXISTS "student_grades_student_id_learning_unit_id_attempt_number_key";

ALTER TABLE public.student_grades
DROP CONSTRAINT IF EXISTS unique_attempts;

-- 2. Remove a coluna 'attempt_number' se ela existir por engano.
ALTER TABLE public.student_grades
DROP COLUMN IF EXISTS attempt_number;

-- 3. Garante que a coluna correta, 'attempts', exista.
ALTER TABLE public.student_grades
ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 1;

-- 4. Cria a constraint de unicidade final e definitiva com um nome claro.
ALTER TABLE public.student_grades
ADD CONSTRAINT student_grades_unique_attempt_per_unit
UNIQUE (enrollment_id, learning_unit_id, student_id, attempts);