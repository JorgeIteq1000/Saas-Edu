// supabase/functions/grade-passback/index.ts -- VERSÃO DA VITÓRIA FINAL

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from 'https://deno.land/x/xml/mod.ts';

// --- Funções Utilitárias ---
function bufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function rawurlencode(str: string): string {
    return encodeURIComponent(str)
        .replace(/!/g, '%21').replace(/'/g, '%27')
        .replace(/\(/g, '%28').replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

// --- VALIDADOR DE ASSINATURA DE ALTA PRECISÃO ---
async function validateOAuthSignature(req: Request, body: string, secret: string): Promise<boolean> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('OAuth ')) return false;

    const params: Record<string, string> = {};
    const regex = /([a-zA-Z_]+)="([^"]+)"/g;
    let match;
    while ((match = regex.exec(authHeader)) !== null) {
        params[match[1]] = decodeURIComponent(match[2]);
    }

    const receivedSignature = params.oauth_signature;
    if (!receivedSignature) return false;
    delete params.oauth_signature;

    const bodyHashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body));
    params.oauth_body_hash = bufferToBase64(bodyHashBuffer);
    
    const sortedKeys = Object.keys(params).sort();
    
    // --- A CORREÇÃO FINAL ESTÁ AQUI ---
    // A string de parâmetros é construída com os valores já codificados.
    // Esta string final é então codificada, o que estava faltando.
    const parameterString = sortedKeys.map(key => `${rawurlencode(key)}=${rawurlencode(params[key])}`).join('&');
    
    const url = new URL(req.url);
    const baseUrl = `https://${url.host}${url.pathname}`;
    const baseString = `POST&${rawurlencode(baseUrl)}&${rawurlencode(parameterString)}`;

    const signingKey = `${rawurlencode(secret)}&`;

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(baseString));
    const calculatedSignature = bufferToBase64(signatureBuffer);

    return receivedSignature === calculatedSignature;
}

serve(async (req) => {
    if (req.method !== 'POST') return new Response("Method Not Allowed", { status: 405 });

    try {
        const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET')!;
        const requestBody = await req.text();

        const isValid = await validateOAuthSignature(req, requestBody, sagahSecret);
        if (!isValid) {
            console.error("log: ❌ Assinatura OAuth inválida. A requisição foi rejeitada.");
            return new Response("Invalid OAuth Signature", { status: 401 });
        }
        
        console.log("log: ✅ Assinatura OAuth validada com sucesso! Processando nota...");
        const xml: any = parse(requestBody);
        const sourcedId = xml.imsx_POXEnvelopeRequest.imsx_POXBody.replaceResultRequest.resultRecord.sourcedGUID.sourcedId;
        const score = parseFloat(xml.imsx_POXEnvelopeRequest.imsx_POXBody.replaceResultRequest.resultRecord.result.resultScore.textString);
        if (typeof sourcedId !== 'string' || isNaN(score)) throw new Error("Dados do XML inválidos.");
        const [enrollmentId, learningUnitId, studentProfileId] = sourcedId.split('::');
        const grade = score * 10;
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { data: disciplineData } = await supabaseAdmin.from('learning_units').select('discipline_id').eq('id', learningUnitId).single();
        if(!disciplineData) throw new Error(`Disciplina da UA ${learningUnitId} não encontrada.`);
        const { error: upsertError } = await supabaseAdmin.from('student_grades').upsert({ enrollment_id: enrollmentId, learning_unit_id: learningUnitId, student_id: studentProfileId, discipline_id: disciplineData.discipline_id, grade: grade, attempt_number: 1 }, { onConflict: 'student_id,learning_unit_id,attempt_number' });
        if (upsertError) throw upsertError;
        console.log(`log: 🎉 Nota ${grade} salva com sucesso para o aluno ${studentProfileId}.`);
        const messageIdentifier = xml.imsx_POXEnvelopeRequest.imsx_POXHeader.imsx_POXRequestHeaderInfo.imsx_messageIdentifier;
        const successResponseXML = `<?xml version = "1.0" encoding = "UTF-8"?><imsx_POXEnvelopeResponse xmlns = "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0"><imsx_POXHeader><imsx_POXResponseHeaderInfo><imsx_version>V1.0</imsx_version><imsx_messageIdentifier>${messageIdentifier}</imsx_messageIdentifier><imsx_statusInfo><imsx_codeMajor>success</imsx_codeMajor><imsx_severity>status</imsx_severity><imsx_description>Result successfully replaced</imsx_description></imsx_statusInfo></imsx_POXResponseHeaderInfo></imsx_POXHeader><imsx_POXBody><replaceResultResponse/></imsx_POXBody></imsx_POXEnvelopeResponse>`;
        return new Response(successResponseXML, { headers: { 'Content-Type': 'application/xml' } });

    } catch (error) {
        console.error("log: 💥 Erro CRÍTICO no grade-passback:", error);
        return new Response("Erro interno ao processar a nota.", { status: 500 });
    }
});