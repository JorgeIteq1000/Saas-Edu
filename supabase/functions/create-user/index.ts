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
    const { email, password, userData } = await req.json()
    console.log(`log: Criando usuário: ${email}`)

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

    // Verifica se o email já existe - CORREÇÃO: usar listUsers
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('Erro ao listar usuários:', listError)
    } else {
      const existingUser = users.find(user => user.email === email)
      if (existingUser) {
        throw new Error('Este email já está em uso')
      }
    }

    // 1. Cria usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    })

    if (authError) {
      console.error('Erro no Auth:', authError)
      
      // Se o erro for de email duplicado, informa melhor
      if (authError.message.includes('already registered') || authError.message.includes('duplicate')) {
        throw new Error('Este email já está em uso')
      }
      throw authError
    }

    console.log(`✅ Usuário Auth criado: ${authData.user.id}`)

    // 2. Cria perfil manualmente com a estrutura CORRETA
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),          // UUID único para o perfil
        user_id: authData.user.id,        // Referência para o usuário do Auth
        full_name: userData.full_name,
        email: email,
        role: userData.role,
        phone: userData.phone,
        active: userData.active
        // created_at e updated_at são preenchidos automaticamente
      })

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
      
      // Fallback: usa RPC
      const { error: rpcError } = await supabaseAdmin.rpc('create_user_profile_correct', {
        p_user_id: authData.user.id,
        p_full_name: userData.full_name,
        p_email: email,
        p_role: userData.role,
        p_phone: userData.phone,
        p_active: userData.active
      })
      
      if (rpcError) {
        console.error('Erro no RPC:', rpcError)
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw new Error(`Falha ao criar perfil: ${rpcError.message}`)
      }
    }

    console.log(`✅ Perfil criado para: ${email}`)

    return new Response(JSON.stringify({ 
      success: true,
      user: authData.user,
      message: 'Usuário criado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error: any) {
    console.error('Erro geral:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})