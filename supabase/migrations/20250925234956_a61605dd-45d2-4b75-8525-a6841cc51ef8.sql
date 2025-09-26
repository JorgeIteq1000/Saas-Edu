-- Inserir cursos de exemplo com as colunas corretas
INSERT INTO courses (name, code, description, course_type, modality, workload_hours, duration_months, min_duration_months, max_duration_months, sagah_disciplines_code, enrollment_fee, monthly_fee, active) VALUES
('Administração', 'ADM001', 'Bacharelado em Administração de Empresas - Curso completo com foco em gestão empresarial, estratégia e liderança.', 'graduacao', 'ead', 3200, 48, 36, 60, 'DISC_ADM_001', 50.00, 350.00, true),
('Direito', 'DIR001', 'Bacharelado em Direito - Formação jurídica completa com base sólida em legislação brasileira.', 'graduacao', 'presencial', 4000, 60, 48, 72, 'DISC_DIR_001', 80.00, 450.00, true),
('Pedagogia', 'PED001', 'Licenciatura em Pedagogia - Preparação para atuação na educação infantil e ensino fundamental.', 'graduacao', 'ead', 3200, 48, 36, 60, 'DISC_PED_001', 40.00, 320.00, true),
('MBA em Gestão Empresarial', 'MBA001', 'Pós-graduação em Gestão Empresarial - Especialização para profissionais em cargos de liderança.', 'pos_graduacao', 'ead', 400, 18, 12, 24, 'DISC_MBA_001', 100.00, 280.00, true),
('Psicologia', 'PSI001', 'Bacharelado em Psicologia - Formação completa em psicologia clínica e organizacional.', 'graduacao', 'presencial', 4000, 60, 48, 72, 'DISC_PSI_001', 70.00, 420.00, true),
('Engenharia de Software', 'ENG001', 'Bacharelado em Engenharia de Software - Formação tecnológica com foco em desenvolvimento.', 'graduacao', 'ead', 3600, 48, 36, 60, 'DISC_ENG_001', 60.00, 380.00, true)
ON CONFLICT (code) DO NOTHING;