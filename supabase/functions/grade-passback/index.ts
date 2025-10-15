// supabase/functions/grade-passback/index.ts
import { XMLParser } from '../_vendor/fast_xml_parser.js';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Templates de resposta XML (inalterados)
const createSuccessResponse = (messageIdentifier: string) => `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXResponseHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${messageIdentifier}</imsx_messageIdentifier>
      <imsx_statusInfo>
        <imsx_codeMajor>success</imsx_codeMajor>
        <imsx_severity>status</imsx_severity>
        <imsx_description>Result data successfully processed.</imsx_description>
      </imsx_statusInfo>
    </imsx_POXResponseHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody>
    <replaceResultResponse/>
  </imsx_POXBody>
</imsx_POXEnvelopeResponse>`;

const createErrorResponse = (messageIdentifier: string, description: string) => `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXResponseHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${messageIdentifier}</imsx_messageIdentifier>
      <imsx_statusInfo>
        <imsx_codeMajor>failure</imsx_codeMajor>
        <imsx_severity>error</imsx_severity>
        <imsx_description>${description}</imsx_description>
      </imsx_statusInfo>
    </imsx_POXResponseHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody/>
</imsx_POXEnvelopeResponse>`;


serve(async (req) => {
  console.log('log: 📬 Requisição recebida em grade-passback...');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let messageIdentifier = 'unknown';

  try {
    const xmlBody = await req.text();
    const parser = new XMLParser();
    const parsedXml = parser.parse(xmlBody);

    messageIdentifier = parsedXml.imsx_POXEnvelopeRequest?.imsx_POXHeader?.imsx_POXRequestHeaderInfo?.imsx_messageIdentifier || 'invalid_xml';
    
    const sourcedId = parsedXml.imsx_POXEnvelopeRequest.imsx_POXBody.replaceResultRequest.resultRecord.sourcedGUID.sourcedId;
    const score = parseFloat(parsedXml.imsx_POXEnvelopeRequest.imsx_POXBody.replaceResultRequest.resultRecord.result.resultScore.textString);
    
    console.log('log: ✅ Dados extraídos do XML (com tentativa):', { sourcedId, score });

    const [enrollmentId, learningUnitId, studentId, attempt] = sourcedId.split('::');
    
    if (!enrollmentId || !learningUnitId || !studentId || !attempt) {
      throw new Error(`sourcedId em formato de recuperação inválido: ${sourcedId}`);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: learningUnitData, error: unitError } = await supabaseAdmin
      .from('learning_units')
      .select('discipline_id')
      .eq('id', learningUnitId)
      .single();

    if (unitError) throw unitError;
    if (!learningUnitData) throw new Error(`Unidade de aprendizagem não encontrada: ${learningUnitId}`);
    
    const { discipline_id } = learningUnitData;
    const grade = score * 10;
    
    console.log(`log: 💾 Salvando nota ${grade} para tentativa ${attempt}`);

    // ===== A CORREÇÃO FINALÍSSIMA ESTÁ AQUI =====
    // Corrigido de 'attempt_number' para 'attempts' para corresponder à sua tabela.
    const { error } = await supabaseAdmin
      .from('student_grades')
      .insert({
        enrollment_id: enrollmentId,
        learning_unit_id: learningUnitId,
        discipline_id: discipline_id,
        grade: grade,
        provider: 'sagah',
        student_id: studentId,
        attempts: parseInt(attempt, 10), // Usando o nome correto e definitivo da coluna
      });

    if (error) {
      console.error('log: 💥 Erro ao salvar a nota no Supabase:', error);
      throw error;
    }

    console.log('log: 🎉 Nota da tentativa salva com sucesso!');

    const responseXml = createSuccessResponse(messageIdentifier);
    return new Response(responseXml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
      status: 200,
    });

  } catch (error) {
    console.error('log: 💥 ERRO GERAL NA FUNÇÃO grade-passback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponseXml = createErrorResponse(messageIdentifier, errorMessage);
    return new Response(errorResponseXml, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
      status: 500,
    });
  }
});