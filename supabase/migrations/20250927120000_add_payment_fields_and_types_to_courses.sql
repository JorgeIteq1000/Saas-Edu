-- Adicionar novas colunas na tabela de cursos para parcelamento e formas de pagamento
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS max_installments INTEGER NOT NULL DEFAULT 12,
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] NOT NULL DEFAULT ARRAY['boleto', 'pix', 'cartao_de_credito'];

-- Adiciona os novos tipos ao ENUM 'course_type' existente
-- O IF NOT EXISTS garante que o comando não dará erro se for executado mais de uma vez.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.course_type'::regtype AND enumlabel = 'tecnico') THEN
        ALTER TYPE public.course_type ADD VALUE 'tecnico';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.course_type'::regtype AND enumlabel = 'livre') THEN
        ALTER TYPE public.course_type ADD VALUE 'livre';
    END IF;
END $$;