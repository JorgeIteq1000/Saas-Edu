import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as oauth from 'https://deno.land/x/oauth_1_0_a@v1.0.0/mod.ts';

// log: Função auxiliar para lidar com CORS e erros
const handleResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  });
};

serve(async (req) => {
  // log: Lidar com a requisição preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { disciplineId } = await req.json();
    if (!disciplineId) throw new Error('O ID da disciplina é obrigatório.');

    // log: Inicializa o cliente do Supabase com a autenticação do usuário que fez a chamada
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // log: Busca os dados do aluno logado e da disciplina solicitada
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return handleResponse({ error: 'Usuário não autenticado' }, 401);

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (profileError) throw profileError;

    const { data: discipline, error: disciplineError } = await supabase.from('disciplines').select('*').eq('id', disciplineId).single();
    if (disciplineError) throw disciplineError;
    if (!discipline) return handleResponse({ error: 'Disciplina não encontrada' }, 404);

    // log: Carrega as credenciais da Sagah dos segredos do projeto
    const sagahKey = Deno.env.get('SAGAH_LTI_KEY')!;
    const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!;
    const sagahLaunchUrl = 'https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite';

    // log: Monta o corpo de dados da requisição LTI
    const launchData: { [key: string]: string } = {
      user_id: profile.id,
      roles: "urn:lti:role:ims/lis/Learner",
      resource_link_id: discipline.sagah_content_id || discipline.id, // Usa o sagah_content_id ou o ID da disciplina como fallback
      resource_link_title: discipline.name,
      lis_person_name_full: profile.full_name,
      lis_person_contact_email_primary: profile.email,
      context_id: discipline.id,
      context_title: discipline.name,
      lti_message_type: 'basic-lti-launch-request',
      lti_version: 'LTI-1p0',
      oauth_callback: 'about:blank',
      oauth_consumer_key: sagahKey,
      oauth_version: '1.0',
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomUUID(),
    };

    // log: Cria a assinatura digital OAuth 1.0, o passo mais importante
    const signature = oauth.createSignature('POST', sagahLaunchUrl, launchData, sagahSecret, {});
    launchData.oauth_signature = signature;

    // log: Retorna a URL e todos os parâmetros para o frontend
    const responsePayload = {
      launch_url: sagahLaunchUrl,
      params: launchData,
    };

    return handleResponse(responsePayload);

  } catch (error) {
    console.error('Erro na função generate-sagah-launch:', error.message);
    return handleResponse({ error: error.message }, 400);
  }
});