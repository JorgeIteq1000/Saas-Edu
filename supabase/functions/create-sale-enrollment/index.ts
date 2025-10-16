// supabase/functions/create-sale-enrollment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { studentData, saleData } = await req.json();
    console.log('log: Recebida nova requisição:', { studentData, saleData });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { user: sellerUser } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!sellerUser) throw new Error("Vendedor não autenticado.");

    const cleanCpf = studentData.document_number.replace(/\D/g, '');

    // Verifica se o aluno já existe
    let studentProfile;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('document_number', cleanCpf)
      .single();
    
    let authUserId = existingProfile?.user_id;

    if (!existingProfile) {
      console.log(`log: Criando novo aluno com CPF ${cleanCpf}`);
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: studentData.email,
        password: cleanCpf,
        email_confirm: true,
        user_metadata: { full_name: studentData.full_name, role: 'aluno' }
      });
      if (authError) throw authError;
      authUserId = newUser.user.id;

      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({ ...studentData, user_id: authUserId, document_number: cleanCpf, role: 'aluno', active: true })
        .select().single();
      if (newProfileError) throw newProfileError;
      studentProfile = newProfile;
    } else {
      console.log(`log: Aluno encontrado: ${existingProfile.full_name}`);
      studentProfile = existingProfile;
    }

    // ===== LÓGICA ATUALIZADA PARA CURSO OU COMBO =====
    if (saleData.productType === 'course') {
      console.log('log: Processando matrícula de curso individual...');
      const { count: existingEnrollmentCount } = await supabaseAdmin
        .from('enrollments').select('*', { count: 'exact', head: true })
        .eq('student_id', studentProfile.id).eq('course_id', saleData.course_id);

      if (existingEnrollmentCount > 0) {
        throw new Error("Este aluno já está matriculado neste curso.");
      }
      
      const { data: newEnrollment, error: enrollmentError } = await supabaseAdmin
        .from('enrollments').insert({
          student_id: studentProfile.id,
          course_id: saleData.course_id,
          seller_id: sellerUser.id,
          status: 'ativo',
          enrollment_fee_status: 'pago',
          coupon_code: saleData.coupon,
        }).select().single();
      if (enrollmentError) throw enrollmentError;
      console.log('log: 🎉 Matrícula de curso individual criada:', newEnrollment.id);

    } else if (saleData.productType === 'combo') {
      console.log('log: Processando matrícula de combo...');
      
      // Gerar um ID de pacote para agrupar as matrículas do combo
      const package_id = crypto.randomUUID();
      const enrollmentsToInsert = saleData.selected_course_ids.map((courseId: string) => ({
          student_id: studentProfile.id,
          course_id: courseId,
          combo_id: saleData.combo_id,
          package_id: package_id,
          seller_id: sellerUser.id,
          status: 'ativo',
          enrollment_fee_status: 'pago',
          coupon_code: saleData.coupon,
      }));

      console.log('log: Preparando para inserir as seguintes matrículas de combo:', enrollmentsToInsert);
      const { error: comboEnrollmentError } = await supabaseAdmin.from('enrollments').insert(enrollmentsToInsert);
      if (comboEnrollmentError) throw comboEnrollmentError;
      console.log(`log: 🎉 Matrículas de combo criadas com o package_id: ${package_id}`);
    }
    // ===================================================

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error: any) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});