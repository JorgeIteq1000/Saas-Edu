import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers para CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para converter ArrayBuffer para Base64
function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Implementação do rawurlencode do PHP
function rawurlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

const handleResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { learningUnitId } = await req.json();
    if (!learningUnitId) throw new Error('O ID da Unidade de Aprendizagem é obrigatório.');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return handleResponse({ error: 'Usuário não autenticado' }, 401);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (profileError) throw profileError;
    if (!profile) return handleResponse({ error: 'Perfil do usuário não encontrado.' }, 404);

    const { data: learningUnit, error: unitError } = await supabase
      .from('learning_units')
      .select('*, discipline:disciplines(*)')
      .eq('id', learningUnitId)
      .single();
    if (unitError) throw unitError;
    if (!learningUnit) return handleResponse({ error: 'Unidade de Aprendizagem não encontrada' }, 404);
    if (!learningUnit.sagah_content_id) return handleResponse({ error: 'Esta UA não possui um Content ID da Sagah.' }, 400);

    // --- LÓGICA DE ASSINATURA MANUAL ---

    const sagahKey = Deno.env.get('SAGAH_LTI_KEY')!;       // "iteq_prd"
    const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!; // "84992f1a787db06bb20f488a9c91a731"
    
    const baseUrl = "https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite";
    const finalLaunchUrl = `${baseUrl}?contentId=${learningUnit.sagah_content_id}`;
    
    // 1. Coleta de todos os parâmetros para a assinatura
    const params: Record<string, string> = {
      user_id: profile.user_id,
      roles: "urn:lti:role:ims/lis/Learner",
      resource_link_id: `${profile.user_id}-${learningUnit.id}`, // ID HIPER-ÚNICO
      resource_link_title: learningUnit.name,
      lis_person_name_full: profile.full_name,
      lis_person_contact_email_primary: profile.email,
      lis_person_sourcedid: profile.user_id,
      context_id: learningUnit.discipline.id,
      context_title: learningUnit.discipline.name,
      tool_consumer_instance_guid: "https://iteqescolas.com.br/",
      lti_version: "LTI-1p0",
      lti_message_type: "basic-lti-launch-request",
      oauth_callback: "about:blank",
      oauth_consumer_key: sagahKey,
      oauth_version: "1.0",
      oauth_nonce: crypto.randomUUID(),
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_signature_method: "HMAC-SHA1",
      contentId: learningUnit.sagah_content_id,
    };

    // 2. Ordena os parâmetros por chave
    const sortedKeys = Object.keys(params).sort();
    
    // 3. Normaliza os parâmetros (cria a query string)
    const normalizedParams = sortedKeys.map(key => `${rawurlencode(key)}=${rawurlencode(params[key])}`).join('&');

    // 4. Cria a Base String para a assinatura
    const baseString = `POST&${rawurlencode(baseUrl)}&${rawurlencode(normalizedParams)}`;

    // 5. Cria a chave de assinatura
    const signingKey = `${rawurlencode(sagahSecret)}&`;

    // 6. Gera a assinatura HMAC-SHA1
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(baseString));
    const signature = bufferToBase64(signatureBuffer);

    // 7. Adiciona a assinatura aos parâmetros que serão enviados
    params['oauth_signature'] = signature;
    
    delete params['contentId'];
    
    const responsePayload = { 
      launch_url: finalLaunchUrl,
      params: params
    };
    
    return handleResponse(responsePayload);

  } catch (error) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO:', error);
    return handleResponse({ error: error.message }, 400);
  }
});