import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user: adminUser } } = await userClient.auth.getUser();
    if (!adminUser) throw new Error("Acesso negado: Requisitante não autenticado.");

    const { data: adminProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('user_id', adminUser.id)
      .single();

    if (profileError || !adminProfile || adminProfile.role !== 'admin_geral') {
      throw new Error("Acesso negado: Permissões insuficientes.");
    }

    const { userIdToImpersonate } = await req.json();
    if (!userIdToImpersonate) throw new Error("ID do usuário a ser personificado não fornecido.");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // CORREÇÃO: Usando o objeto 'options' para o redirecionamento
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userIdToImpersonate,
      options: {
        redirectTo: '/', // Redireciona para a raiz do site após o login
      }
    });

    if (error) throw error;

    const signInLink = data.properties.action_link;

    return new Response(JSON.stringify({ signInLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})