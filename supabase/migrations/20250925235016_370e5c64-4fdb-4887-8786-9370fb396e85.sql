-- Inserir cursos de exemplo (sem ON CONFLICT já que não há constraint única)
INSERT INTO courses (name, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) 
SELECT 'Administração', 'Bacharelado em Administração de Empresas - Curso completo com foco em gestão empresarial, estratégia e liderança.', 'graduacao', 'ead', 3200, 48, 36, 60, 'ADM001', 150.00, 350.00, true
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE sagah_disciplines_code = 'ADM001');

INSERT INTO courses (name, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) 
SELECT 'Direito', 'Bacharelado em Direito - Formação jurídica completa com base sólida em legislação brasileira.', 'graduacao', 'presencial', 4000, 60, 48, 72, 'DIR001', 200.00, 450.00, true
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE sagah_disciplines_code = 'DIR001');

INSERT INTO courses (name, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) 
SELECT 'Pedagogia', 'Licenciatura em Pedagogia - Preparação para atuação na educação infantil e ensino fundamental.', 'graduacao', 'ead', 3200, 48, 36, 60, 'PED001', 120.00, 320.00, true
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE sagah_disciplines_code = 'PED001');

INSERT INTO courses (name, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) 
SELECT 'MBA em Gestão Empresarial', 'Pós-graduação em Gestão Empresarial - Especialização para profissionais em cargos de liderança.', 'pos_graduacao', 'ead', 400, 18, 12, 24, 'MBA001', 300.00, 280.00, true
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE sagah_disciplines_code = 'MBA001');

INSERT INTO courses (name, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) 
SELECT 'Psicologia', 'Bacharelado em Psicologia - Formação completa em psicologia clínica e organizacional.', 'graduacao', 'presencial', 4000, 60, 48, 72, 'PSI001', 180.00, 420.00, true
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE sagah_disciplines_code = 'PSI001');