// supabase/functions/generate-sagah-launch/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Headers para CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Funções de utilidade para a assinatura OAuth 1.0a
function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function rawurlencode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// Função de resposta padrão
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
    const { learningUnitId, enrollmentId } = await req.json();
    if (!learningUnitId || !enrollmentId) {
      throw new Error('O ID da Unidade de Aprendizagem e o ID da Matrícula são obrigatórios.');
    }

    // Cria o cliente Supabase autenticado
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return handleResponse({ error: 'Usuário não autenticado' }, 401);

    // Busca os dados do perfil, da UA e da disciplina
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (profileError || !profile) throw profileError || new Error('Perfil do usuário não encontrado.');

    const { data: learningUnit, error: unitError } = await supabase.from('learning_units').select('*, discipline:disciplines(*)').eq('id', learningUnitId).single();
    if (unitError || !learningUnit) throw unitError || new Error('Unidade de Aprendizagem não encontrada.');
    if (!learningUnit.sagah_content_id) return handleResponse({ error: 'Esta UA não possui um Content ID da Sagah.' }, 400);

    // LÓGICA DE RECUPERAÇÃO
    // 1. Contamos quantas tentativas o aluno já fez para esta UA.
    const { count: attemptsCount, error: countError } = await supabase
      .from('student_grades')
      .select('*', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId)
      .eq('learning_unit_id', learningUnitId)
      .eq('student_id', profile.id);

    if (countError) throw countError;
    
    // A próxima tentativa é o número de tentativas existentes + 1.
    const nextAttempt = (attemptsCount ?? 0) + 1;
    console.log(`log: Gerando link para a tentativa número ${nextAttempt}`);

    // Configurações LTI
    const sagahKey = Deno.env.get('SAGAH_LTI_KEY')!;
    const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!;
    const baseUrl = "https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite";
    const finalLaunchUrl = `${baseUrl}?contentId=${learningUnit.sagah_content_id}`;
    
    // Parâmetros para devolução de notas (Grade Passback)
    const outcomeServiceUrl = `${Deno.env.get('SUPABASE_URL')!}/functions/v1/grade-passback`;
    
    // CORREÇÃO FINAL: Tornamos ambos os IDs únicos para cada tentativa
    const sourcedId = `${enrollmentId}::${learningUnit.id}::${profile.id}::${nextAttempt}`;
    const resourceLinkId = `${profile.user_id}-${learningUnit.id}-${nextAttempt}`;
    
    // Coleta de todos os parâmetros para a assinatura
    const params: Record<string, string> = {
      user_id: profile.user_id,
      roles: "urn:lti:role:ims/lis/Learner",
      resource_link_id: resourceLinkId, // Usando o ID único para a atividade
      resource_link_title: learningUnit.name,
      lis_person_name_full: profile.full_name,
      lis_person_contact_email_primary: profile.email,
      lis_person_sourcedid: profile.user_id,
      context_id: learningUnit.discipline.id,
      context_title: learningUnit.discipline.name,
      tool_consumer_instance_guid: "https://gradgate.com.br/", // Altere para seu domínio, se necessário
      lti_version: "LTI-1p0",
      lti_message_type: "basic-lti-launch-request",
      oauth_callback: "about:blank",
      oauth_consumer_key: sagahKey,
      oauth_version: "1.0",
      oauth_nonce: crypto.randomUUID(),
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_signature_method: "HMAC-SHA1",
      contentId: learningUnit.sagah_content_id,
      lis_outcome_service_url: outcomeServiceUrl,
      lis_result_sourcedid: sourcedId, // Usando o ID único para a nota
    };

    // Lógica de assinatura manual (inalterada)
    const sortedKeys = Object.keys(params).sort();
    const normalizedParams = sortedKeys.map(key => `${rawurlencode(key)}=${rawurlencode(params[key])}`).join('&');
    const baseString = `POST&${rawurlencode(baseUrl)}&${rawurlencode(normalizedParams)}`;
    const signingKey = `${rawurlencode(sagahSecret)}&`;

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(baseString));
    const signature = bufferToBase64(signatureBuffer);

    params['oauth_signature'] = signature;
    delete params['contentId'];
    
    console.log("log: 🚀 SourcedId único gerado:", params.lis_result_sourcedid);
    console.log("log: 🔗 Resource Link ID único gerado:", params.resource_link_id);

    const responsePayload = { 
      launch_url: finalLaunchUrl,
      params: params
    };

    return handleResponse(responsePayload);

  } catch (error) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO generate-sagah-launch:', error);
    return handleResponse({ error: error.message }, 400);
  }
});