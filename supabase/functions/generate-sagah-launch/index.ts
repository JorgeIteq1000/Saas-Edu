// supabase/functions/generate-sagah-launch/index.ts

import { createClient } from '@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { OAuth } from 'oauth_ts';

// Configurações do LTI
const SAGAH_KEY = Deno.env.get('SAGAH_LTI_KEY') || 'iteq_prd';
const SAGAH_SECRET = Deno.env.get('SAGAH_LTI_SECRET') || '84992f1a787db06bb20f488a9c91a731';
const SAGAH_LAUNCH_URL = 'https://api.plataforma.grupoa.education/v2/safea-client/auth/launch/lti/ies/iteq_prod/application/gaia-lite';

serve(async (req) => {
  console.log('log: Iniciando a função generate-sagah-launch');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, disciplineId, learningUnitId } = await req.json();
    console.log(`log: Recebido userId: ${userId}, disciplineId: ${disciplineId}, learningUnitId: ${learningUnitId}`);

    if (!userId || !disciplineId || !learningUnitId) {
      throw new Error('userId, disciplineId e learningUnitId são obrigatórios.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    const { data: discipline, error: disciplineError } = await supabaseAdmin
      .from('disciplines')
      .select('id, name')
      .eq('id', disciplineId)
      .single();

    const { data: learningUnit, error: learningUnitError } = await supabaseAdmin
      .from('learning_units')
      .select('id, name, sagah_content_id')
      .eq('id', learningUnitId)
      .single();

    if (profileError || disciplineError || learningUnitError) {
      console.error({ profileError, disciplineError, learningUnitError });
      throw new Error('Não foi possível encontrar os dados para o lançamento LTI.');
    }
    
    console.log(`log: Dados encontrados - Aluno: ${profile.full_name}, Disciplina: ${discipline.name}, UA: ${learningUnit.name}`);

    const [firstName, ...lastNameParts] = (profile.full_name || '').split(' ');
    const lastName = lastNameParts.join(' ');
    
    const launchParams: { [key: string]: string } = {
      contentId: learningUnit.sagah_content_id,
      user_id: profile.id,
      lis_person_sourcedid: profile.id,
      roles: 'urn:lti:role:ims/lis/Learner',
      lis_person_name_full: profile.full_name || 'Aluno',
      lis_person_name_given: firstName || 'Aluno',
      lis_person_name_family: lastName || 'Sobrenome',
      lis_person_contact_email_primary: profile.email,
      context_id: discipline.id,
      context_title: discipline.name,
      context_label: discipline.name,
      resource_link_id: learningUnit.id,
      resource_link_title: learningUnit.name,
      tool_consumer_instance_guid: 'https://iteqescolas.com.br/',
      launch_presentation_locale: 'pt-BR',
      custom_debug: 'true',
      lti_message_type: 'basic-lti-launch-request',
      lti_version: 'LTI-1p0',
      oauth_consumer_key: SAGAH_KEY,
      oauth_nonce: crypto.randomUUID(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      oauth_callback: 'about:blank',
    };

    const oauth = new OAuth({
      consumer: { key: SAGAH_KEY, secret: SAGAH_SECRET },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(key);
        const baseBytes = encoder.encode(base_string);
        
        return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, true, ['sign'])
          .then(signingKey => crypto.subtle.sign('HMAC', signingKey, baseBytes))
          .then(signature => btoa(String.fromCharCode(...new Uint8Array(signature))));
      },
    });

    const signature = await oauth.get_signature('POST', SAGAH_LAUNCH_URL, launchParams);
    console.log(`log: Assinatura gerada com sucesso: ${signature}`);

    const finalLaunchData = {
      ...launchParams,
      oauth_signature: signature,
    };
    
    const finalLaunchUrl = `${SAGAH_LAUNCH_URL}?contentId=${encodeURIComponent(learningUnit.sagah_content_id)}`;
    console.log(`log: URL de lançamento final: ${finalLaunchUrl}`);
    
    return new Response(
      JSON.stringify({
        launchUrl: finalLaunchUrl,
        launchData: finalLaunchData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    console.error('log: Erro na execução da função:', err);
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});