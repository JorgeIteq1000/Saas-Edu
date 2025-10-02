import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OAuth from 'https://esm.sh/oauth-1.0a@2.2.6'

// Funções auxiliares (sem alterações)
const handleResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  })
}

function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
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

    const { data: learningUnit, error: unitError } = await supabase
      .from('learning_units')
      .select('*, discipline:disciplines(*)')
      .eq('id', learningUnitId)
      .single();

    if (unitError) throw unitError;
    if (!learningUnit) return handleResponse({ error: 'Unidade de Aprendizagem não encontrada' }, 404);
    if (!learningUnit.sagah_content_id) return handleResponse({ error: 'Esta UA não possui um Content ID da Sagah.' }, 400);

    const sagahKey = Deno.env.get('SAGAH_LTI_KEY')!;
    const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!;
    
    // log: CORREÇÃO DEFINITIVA
    // A URL base para a assinatura NÃO contém o contentId.
    const baseUrl = 'https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite';
    
    // A URL final para o formulário SIM contém o contentId.
    const finalLaunchUrl = `${baseUrl}?contentId=${learningUnit.sagah_content_id}`;

    const oauth = new OAuth({
      consumer: { key: sagahKey, secret: sagahSecret },
      signature_method: 'HMAC-SHA1',
      async hash_function(base_string, key) {
        const encoder = new TextEncoder();
        // A chave de assinatura precisa do '&' no final, exatamente como no PHP.
        const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key + '&'), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(base_string));
        return bufferToBase64(signatureBuffer);
      },
    });

    // Os dados a serem enviados no corpo da requisição POST
    const requestBodyData = {
      user_id: profile.id,
      roles: "urn:lti:role:ims/lis/Learner",
      resource_link_id: learningUnit.id,
      resource_link_title: learningUnit.name,
      lis_person_name_full: profile.full_name,
      lis_person_contact_email_primary: profile.email,
      context_id: learningUnit.discipline.id,
      context_title: learningUnit.discipline.name,
      lti_message_type: 'basic-lti-launch-request',
      lti_version: 'LTI-1p0',
      oauth_callback: 'about:blank',
    };

    // Para a assinatura, TODOS os parâmetros são incluídos (inclusive o contentId)
    const dataToSign = {
        ...requestBodyData,
        contentId: learningUnit.sagah_content_id
    };

    const requestData = {
        url: baseUrl, // Assinatura é baseada na URL limpa
        method: 'POST',
        data: dataToSign,
    };
    
    const signedParams = oauth.authorize(requestData);

    const responsePayload = {
      launch_url: finalLaunchUrl, // Retorna a URL final com o contentId
      params: signedParams,
    };

    return handleResponse(responsePayload);

  } catch (error) {
    console.error('Erro na função generate-sagah-launch:', error.message);
    return handleResponse({ error: error.message }, 400);
  }
});