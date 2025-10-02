// supabase/functions/grade-passback/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/x/xml/mod.ts';

// --- CONFIGURAÇÃO ---
const TEST_MODE = false; // ⚠️ Certifique-se que está 'false' em produção!

// --- FUNÇÕES OAUTH (OBRIGATÓRIAS PARA SAGAH) ---
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

async function validateOAuthSignature(req: Request, body: string, secret: string): Promise<boolean> {
    if (TEST_MODE) {
        console.log("log: 🧪 MODO TESTE - OAuth bypassado");
        return true;
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('OAuth ')) {
        console.error("log: ❌ Cabeçalho OAuth ausente");
        return false;
    }

    try {
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
    } catch (error) {
        console.error("log: 💥 Erro na validação OAuth:", error);
        return false;
    }
}

// --- RESPOSTA XML (OBRIGATÓRIA PARA SAGAH) ---
function createSuccessXML(requestMessageIdentifier: string, sourcedId: string, score: number): string {
    const responseMessageIdentifier = `response-${Date.now()}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltivp1/xsd/imsoms_v1p0">
    <imsx_POXHeader>
        <imsx_POXResponseHeaderInfo>
            <imsx_version>V1.0</imsx_version>
            <imsx_messageIdentifier>${responseMessageIdentifier}</imsx_messageIdentifier>
            <imsx_statusInfo>
                <imsx_codeMajor>success</imsx_codeMajor>
                <imsx_severity>status</imsx_severity>
                <imsx_description>Score for ${sourcedId} is now ${score}</imsx_description>
                <imsx_messageRefIdentifier>${requestMessageIdentifier}</imsx_messageRefIdentifier>
                <imsx_operationRefIdentifier>replaceResult</imsx_operationRefIdentifier>
            </imsx_statusInfo>
        </imsx_POXResponseHeaderInfo>
    </imsx_POXHeader>
    <imsx_POXBody>
        <replaceResultResponse/>
    </imsx_POXBody>
</imsx_POXEnvelopeResponse>`;
}

serve(async (req: Request) => {
    console.log("log: 📨 Recebida requisição LTI");
    
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const requestBody = await req.text();
        console.log("log: 📝 Body recebido");

        const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET');
        if (!sagahSecret) {
            throw new Error("SAGAH_LTI_SECRET não configurada");
        }

        const isValid = await validateOAuthSignature(req, requestBody, sagahSecret);
        if (!isValid) {
            console.error("log: ❌ Assinatura OAuth inválida - Rejeitando");
            return new Response("Invalid OAuth Signature", { status: 401 });
        }
        
        console.log("log: ✅ Assinatura OAuth validada!");

        const xml = parse(requestBody);
        
        const sourcedId = xml?.imsx_POXEnvelopeRequest?.imsx_POXBody?.replaceResultRequest?.resultRecord?.sourcedGUID?.sourcedId as string;
        const scoreText = xml?.imsx_POXEnvelopeRequest?.imsx_POXBody?.replaceResultRequest?.resultRecord?.result?.resultScore?.textString as string;
        const requestMessageIdentifier = xml?.imsx_POXEnvelopeRequest?.imsx_POXHeader?.imsx_POXRequestHeaderInfo?.imsx_messageIdentifier as string;
        
        console.log("log: 📊 Dados extraídos:", { sourcedId, scoreText });

        if (!sourcedId) throw new Error("sourcedId inválido");
        if (!scoreText || isNaN(parseFloat(scoreText))) throw new Error(`Score inválido: ${scoreText}`);

        const score = parseFloat(scoreText);
        const [enrollmentId, learningUnitId, studentProfileId] = sourcedId.split('::');
        const grade = score * 10;

        console.log(`log: 👤 Processando nota ${grade} para aluno ${studentProfileId}`);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!, 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: disciplineData, error: disciplineError } = await supabaseAdmin
            .from('learning_units')
            .select('discipline_id')
            .eq('id', learningUnitId)
            .single();
            
        if (disciplineError) throw disciplineError;

        const { error: upsertError } = await supabaseAdmin
            .from('student_grades') // <-- NOME DA TABELA CORRETO
            .upsert({
                enrollment_id: enrollmentId,
                learning_unit_id: learningUnitId,
                student_id: studentProfileId,
                discipline_id: disciplineData.discipline_id,
                grade: grade,
                attempt_number: 1 // Ou sua lógica para número de tentativas
            }, { 
                onConflict: 'student_id,learning_unit_id,attempt_number' 
            });
            
        if (upsertError) throw upsertError;

        console.log("log: ✅ Nota salva com sucesso!");

        const successResponseXML = createSuccessXML(requestMessageIdentifier, sourcedId, score);
        return new Response(successResponseXML, { 
            headers: { 'Content-Type': 'application/xml' } 
        });

    } catch (error) {
        console.error("log: 💥 Erro:", error.message);
        const errorResponseXML = `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltivp1/xsd/imsoms_v1p0">
    <imsx_POXHeader>
        <imsx_POXResponseHeaderInfo>
            <imsx_version>V1.0</imsx_version>
            <imsx_messageIdentifier>error-${Date.now()}</imsx_messageIdentifier>
            <imsx_statusInfo>
                <imsx_codeMajor>failure</imsx_codeMajor>
                <imsx_severity>error</imsx_severity>
                <imsx_description>${error.message}</imsx_description>
            </imsx_statusInfo>
        </imsx_POXResponseHeaderInfo>
    </imsx_POXHeader>
    <imsx_POXBody/>
</imsx_POXEnvelopeResponse>`;
        return new Response(errorResponseXML, { 
            status: 500, 
            headers: { 'Content-Type': 'application/xml' } 
        });
    }
});