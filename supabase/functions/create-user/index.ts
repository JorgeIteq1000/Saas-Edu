import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// log: Headers para permitir a chamada da função a partir do nosso app (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // log: Trata a requisição OPTIONS (pré-voo do CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, userData } = await req.json()
    console.log(`log: Recebida requisição para criar usuário: ${email}`);

    // log: Cria um cliente admin do Supabase que tem permissões elevadas
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

    // log: Chama a função de admin para criar um novo usuário
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirma o email para simplificar
      user_metadata: userData, // Passa os dados extras (nome, cargo, etc.)
    })

    if (error) {
      console.error('log: Erro ao criar usuário no Supabase Auth:', error);
      throw error
    }

    console.log(`log: Usuário ${email} criado com sucesso no Auth. ID: ${data.user.id}`);
    
    // O trigger 'on_auth_user_created' no banco de dados cuidará de criar o perfil na tabela 'profiles'.

    return new Response(JSON.stringify({ user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    console.error('log: Erro geral na função create-user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})