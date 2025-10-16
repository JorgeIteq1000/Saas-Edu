-- Adiciona a coluna 'provider' para identificar a origem da nota (ex: 'sagah')
ALTER TABLE public.student_grades
ADD COLUMN provider TEXT;