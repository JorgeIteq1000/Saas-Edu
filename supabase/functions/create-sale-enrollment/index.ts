// supabase/functions/create-sale-enrollment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("log: Função 'create-sale-enrollment' iniciada.");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      studentData, // Objeto com todos os dados do aluno (nome, cpf, email, etc.)
      saleData,    // Objeto com os dados da venda (course_id, combo_id, coupon)
    } = await req.json();

    console.log('log: Recebida nova requisição de matrícula:', { studentData, saleData });

    // Crie um cliente Supabase com permissões de administrador para executar operações críticas.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Pega o vendedor logado que está fazendo a requisição
    const { data: { user: sellerUser } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!sellerUser) {
        throw new Error("Vendedor não autenticado.");
    }

    // Limpa o CPF para usar como senha e para buscas
    const cleanCpf = studentData.document_number.replace(/\D/g, '');

    // 1. VERIFICAR SE O ALUNO JÁ EXISTE PELO CPF
    let studentProfile;
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('document_number', cleanCpf)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      throw profileError;
    }
    
    studentProfile = existingProfile;
    let authUserId = existingProfile?.user_id;

    // 2. SE O ALUNO NÃO EXISTE, CRIE O AUTH USER E O PROFILE
    if (!studentProfile) {
      console.log(`log: CPF ${cleanCpf} não encontrado. Criando novo aluno...`);
      // Cria o usuário de autenticação
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: studentData.email,
        password: cleanCpf,
        email_confirm: true, // Auto-confirma o email
        user_metadata: {
          full_name: studentData.full_name,
          role: 'aluno'
        }
      });
      if (authError) throw authError;

      authUserId = newUser.user.id;
      console.log(`log: Novo usuário de autenticação criado com ID: ${authUserId}`);

      // Cria o perfil na tabela 'profiles'
      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          ...studentData,
          user_id: authUserId,
          document_number: cleanCpf, // Salva o CPF limpo
          role: 'aluno',
          active: true,
        })
        .select()
        .single();
      
      if (newProfileError) throw newProfileError;
      studentProfile = newProfile;
      console.log(`log: Novo perfil criado para ${studentProfile.full_name}`);
    } else {
      console.log(`log: Aluno encontrado com CPF ${cleanCpf}: ${studentProfile.full_name}`);
      // Poderíamos adicionar aqui uma lógica para atualizar os dados do aluno se necessário
    }

    // 3. VERIFICAR SE JÁ EXISTE UMA MATRÍCULA PARA O MESMO CURSO/COMBO
    console.log('log: Verificando matrículas existentes...');
    const existingEnrollmentQuery = supabaseAdmin
      .from('enrollments')
      .select('id', { count: 'exact' })
      .eq('student_id', studentProfile.id);

    if (saleData.course_id) {
      existingEnrollmentQuery.eq('course_id', saleData.course_id);
    } else if (saleData.combo_id) {
      existingEnrollmentQuery.eq('combo_id', saleData.combo_id);
    }
    
    const { count: existingEnrollmentCount, error: checkError } = await existingEnrollmentQuery;
    
    if (checkError) throw checkError;

    if (existingEnrollmentCount > 0) {
      throw new Error("Este aluno já está matriculado neste curso ou combo.");
    }
    console.log('log: Nenhuma matrícula duplicada encontrada. Prosseguindo...');

    // 4. CRIAR A NOVA MATRÍCULA (ENROLLMENT)
    const { data: newEnrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: studentProfile.id,
        course_id: saleData.course_id || null,
        combo_id: saleData.combo_id || null,
        seller_id: sellerUser.id,
        // Adicione aqui outros campos necessários para a matrícula
        status: 'ativo', // Exemplo
        enrollment_fee_status: 'pago', // Exemplo
        coupon_code: saleData.coupon, // Campo do cupom
      })
      .select()
      .single();

    if (enrollmentError) throw enrollmentError;

    console.log('log: 🎉 Matrícula criada com sucesso! ID:', newEnrollment.id);

    return new Response(JSON.stringify({ success: true, enrollment: newEnrollment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});