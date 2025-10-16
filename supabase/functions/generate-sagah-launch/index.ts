// supabase/functions/generate-sagah-launch/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function rawurlencode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16));
}

const handleResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const ATTEMPT_FINISHED_THRESHOLD = 2.1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { learningUnitId, enrollmentId } = await req.json();
    if (!learningUnitId || !enrollmentId) {
      throw new Error('O ID da Unidade de Aprendizagem e o ID da Matrícula são obrigatórios.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return handleResponse({ error: 'Usuário não autenticado' }, 401);

    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (!profile) throw new Error('Perfil do usuário não encontrado.');

    const { data: learningUnit } = await supabase.from('learning_units').select('*, discipline:disciplines(*)').eq('id', learningUnitId).single();
    if (!learningUnit) throw new Error('Unidade de Aprendizagem não encontrada.');

    // ===== NOVA LÓGICA INTELIGENTE DE TENTATIVAS =====
    console.log('log: Verificando a última tentativa do aluno...');
    const { data: latestGrade, error: gradeError } = await supabase
      .from('student_grades')
      .select('grade, attempts')
      .eq('enrollment_id', enrollmentId)
      .eq('learning_unit_id', learningUnitId)
      .eq('student_id', profile.id)
      .order('attempts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gradeError) throw gradeError;

    let nextAttempt: number;
    if (!latestGrade) {
      // Nenhuma tentativa anterior, esta é a primeira.
      nextAttempt = 1;
      console.log('log: Nenhuma nota anterior encontrada. Iniciando tentativa 1.');
    } else {
      const currentAttempt = latestGrade.attempts ?? 1;
      const currentGrade = latestGrade.grade ?? 0;

      // Se a nota for maior que 2.1, a tentativa é considerada "finalizada".
      // Então, a próxima ação é uma nova tentativa de recuperação.
      if (currentGrade > ATTEMPT_FINISHED_THRESHOLD) {
        nextAttempt = currentAttempt + 1;
        console.log(`log: A última nota foi ${currentGrade} (> ${ATTEMPT_FINISHED_THRESHOLD}). Iniciando nova tentativa de recuperação: ${nextAttempt}.`);
      } else {
        // Se a nota for <= 2.1, o aluno está "Em Progresso".
        // Ele deve continuar na mesma tentativa.
        nextAttempt = currentAttempt;
        console.log(`log: A última nota foi ${currentGrade} (<= ${ATTEMPT_FINISHED_THRESHOLD}). Continuando na mesma tentativa: ${nextAttempt}.`);
      }
    }
    // ===================================================

    const sagahKey = Deno.env.get('SAGAH_LTI_KEY')!;
    const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!;
    const baseUrl = "https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite";
    const finalLaunchUrl = `${baseUrl}?contentId=${learningUnit.sagah_content_id}`;
    
    const outcomeServiceUrl = `${Deno.env.get('SUPABASE_URL')!}/functions/v1/grade-passback`;
    
    const sourcedId = `${enrollmentId}::${learningUnit.id}::${profile.id}::${nextAttempt}`;
    const resourceLinkId = `${profile.user_id}-${learningUnit.id}-${nextAttempt}`;
    
    const params: Record<string, string> = {
      user_id: profile.user_id,
      roles: "urn:lti:role:ims/lis/Learner",
      resource_link_id: resourceLinkId,
      resource_link_title: learningUnit.name,
      lis_person_name_full: profile.full_name,
      lis_person_contact_email_primary: profile.email,
      lis_person_sourcedid: profile.user_id,
      context_id: learningUnit.discipline.id,
      context_title: learningUnit.discipline.name,
      tool_consumer_instance_guid: "https://gradgate.com.br/",
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
      lis_result_sourcedid: sourcedId,
    };

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
    
    console.log("log: 🚀 SourcedId gerado:", params.lis_result_sourcedid);
    console.log("log: 🔗 Resource Link ID gerado:", params.resource_link_id);

    return handleResponse({ launch_url: finalLaunchUrl, params });

  } catch (error) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO generate-sagah-launch:', error);
    return handleResponse({ error: error.message }, 400);
  }
});