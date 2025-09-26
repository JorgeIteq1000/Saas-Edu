import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating test users...');

    // Create Supabase Admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const testUsers = [
      {
        email: 'admin@gradgate.com',
        password: 'admin123456',
        metadata: {
          full_name: 'Admin Sistema',
          role: 'admin_geral',
          phone: '(11) 99999-1111',
          document_number: '111.111.111-11'
        }
      },
      {
        email: 'gestor@gradgate.com',
        password: 'gestor123456',
        metadata: {
          full_name: 'Maria Gestora',
          role: 'gestor',
          phone: '(11) 99999-2222',
          document_number: '222.222.222-22'
        }
      },
      {
        email: 'vendedor@gradgate.com',
        password: 'vendedor123456',
        metadata: {
          full_name: 'João Vendedor',
          role: 'vendedor',
          phone: '(11) 99999-3333',
          document_number: '333.333.333-33'
        }
      },
      {
        email: 'colaborador@gradgate.com',
        password: 'colaborador123456',
        metadata: {
          full_name: 'Ana Colaboradora',
          role: 'colaborador',
          phone: '(11) 99999-4444',
          document_number: '444.444.444-44'
        }
      },
      {
        email: 'aluno@gradgate.com',
        password: 'aluno123456',
        metadata: {
          full_name: 'Pedro Estudante',
          role: 'aluno',
          phone: '(11) 99999-5555',
          document_number: '555.555.555-55'
        }
      }
    ];

    const results = [];

    for (const user of testUsers) {
      console.log(`Creating user: ${user.email}`);
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: user.metadata
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error);
        results.push({
          email: user.email,
          success: false,
          error: error.message
        });
      } else {
        console.log(`User ${user.email} created successfully`);
        results.push({
          email: user.email,
          success: true,
          user_id: data.user?.id
        });
      }
    }

    // Create team and courses after users are created
    console.log('Creating team and courses...');

    // Create team
    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        name: 'Equipe Vendas SP',
        cnpj: '12.345.678/0001-90',
        active: true
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
    }

    // Create courses
    const courses = [
      {
        name: 'Administração EAD',
        description: 'Curso de Graduação em Administração na modalidade EAD',
        code: 'ADM-EAD',
        course_type: 'graduacao',
        modality: 'ead',
        duration_months: 48,
        workload_hours: 3200,
        enrollment_fee: 150.00,
        monthly_fee: 299.90,
        active: true
      },
      {
        name: 'MBA Gestão de Projetos',
        description: 'MBA em Gestão de Projetos',
        code: 'MBA-GP',
        course_type: 'pos_graduacao',
        modality: 'presencial',
        duration_months: 18,
        workload_hours: 400,
        enrollment_fee: 200.00,
        monthly_fee: 899.90,
        active: true
      },
      {
        name: 'Técnico em Informática',
        description: 'Curso Técnico em Informática',
        code: 'TEC-INFO',
        course_type: 'tecnico',
        modality: 'hibrido',
        duration_months: 24,
        workload_hours: 1200,
        enrollment_fee: 100.00,
        monthly_fee: 199.90,
        active: true
      }
    ];

    const { error: coursesError } = await supabaseAdmin
      .from('courses')
      .insert(courses);

    if (coursesError) {
      console.error('Error creating courses:', coursesError);
    }

    // Update profiles to link gestor and vendedor to team
    if (teamData) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ team_id: teamData.id })
        .in('email', ['gestor@gradgate.com', 'vendedor@gradgate.com']);

      if (updateError) {
        console.error('Error updating profiles with team_id:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Test users creation completed',
        results,
        team_created: !teamError,
        courses_created: !coursesError
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})