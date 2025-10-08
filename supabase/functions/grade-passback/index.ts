// supabase/functions/grade-passback/index.ts -- VERSÃO DE PRODUÇÃO
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

// --- VALIDADOR DE ASSINATURA OAUTH ---
async function validateOAuthSignature(req: Request, body: string, secret: string): Promise<boolean> {
    console.log("--- INICIANDO DEBUG OAUTH ---");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('OAuth ')) {
        console.error("log: ❌ Cabeçalho OAuth ausente");
        return false;
    }
    console.log("1. Cabeçalho Auth Recebido:", authHeader);

    try {
        const params: Record<string, string> = {};
        const regex = /([a-zA-Z_]+)="([^"]+)"/g;
        let match;
        while ((match = regex.exec(authHeader)) !== null) {
            params[match[1]] = decodeURIComponent(match[2]);
        }
        console.log("2. Parâmetros extraídos:", params);

        const receivedSignature = params.oauth_signature;
        if (!receivedSignature) return false;
        console.log("3. Assinatura Recebida:", receivedSignature);
        delete params.oauth_signature;

        const bodyHashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body));
        params.oauth_body_hash = bufferToBase64(bodyHashBuffer);
        console.log("4. Hash do Body Calculado:", params.oauth_body_hash);
        
        const sortedKeys = Object.keys(params).sort();
        const parameterString = sortedKeys.map(key => `${rawurlencode(key)}=${rawurlencode(params[key])}`).join('&');
        console.log("5. String de Parâmetros:", parameterString);
        
        const url = new URL(req.url);
        const baseUrl = `https://${url.host}${url.pathname}`;
        console.log("6. URL Base:", baseUrl);

        const baseString = `POST&${rawurlencode(baseUrl)}&${rawurlencode(parameterString)}`;
        console.log("7. Base String Final:", baseString);

        const signingKey = `${rawurlencode(secret)}&`;
        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(baseString));
        const calculatedSignature = bufferToBase64(signatureBuffer);
        console.log("8. Assinatura Calculada:", calculatedSignature);

        const isValid = receivedSignature === calculatedSignature;
        console.log(`9. Resultado: ${isValid ? 'VÁLIDA ✅' : 'INVÁLIDA ❌'}`);
        console.log("--- FIM DEBUG OAUTH ---");
        return isValid;

    } catch (error) {
        console.error("log: 💥 Erro na validação OAuth:", error);
        return false;
    }
}

// --- GERAÇÃO DE RESPOSTAS XML ---
function createLtiResponse(messageId: string, codeMajor: 'success' | 'failure', description: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
    <imsx_POXHeader>
        <imsx_POXResponseHeaderInfo>
            <imsx_version>V1.0</imsx_version>
            <imsx_messageIdentifier>response-${Date.now()}</imsx_messageIdentifier>
            <imsx_statusInfo>
                <imsx_codeMajor>${codeMajor}</imsx_codeMajor>
                <imsx_severity>${codeMajor === 'success' ? 'status' : 'error'}</imsx_severity>
                <imsx_description>${description}</imsx_description>
                <imsx_messageRefIdentifier>${messageId || 'unknown'}</imsx_messageRefIdentifier>
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
    console.log(`log: 📨 Recebida requisição ${req.method} para ${req.url}`);

    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const requestBody = await req.text();
    const xml = parse(requestBody);
    const messageId = xml?.imsx_POXEnvelopeRequest?.imsx_POXHeader?.imsx_POXRequestHeaderInfo?.imsx_messageIdentifier as string;

    try {
        console.log("log: 📝 Body recebido:", requestBody.substring(0, 500) + "...");
        
        const sagahSecret = Deno.env.get('SAGAH_LTI_SECRET');
        if (!sagahSecret) {
            throw new Error("SAGAH_LTI_SECRET não configurada no ambiente.");
        }

        const isValid = await validateOAuthSignature(req, requestBody, sagahSecret);
        if (!isValid) {
            console.error("log: ❌ Assinatura OAuth inválida. Rejeitando.");
            return new Response("Invalid OAuth Signature", { status: 401 });
        }
        
        console.log("log: ✅ Assinatura OAuth validada!");

        // --- LÓGICA DE NEGÓCIO E BANCO DE DADOS ---
        const sourcedId = xml?.imsx_POXEnvelopeRequest?.imsx_POXBody?.replaceResultRequest?.resultRecord?.sourcedGUID?.sourcedId as string;
        const scoreText = xml?.imsx_POXEnvelopeRequest?.imsx_POXBody?.replaceResultRequest?.resultRecord?.result?.resultScore?.textString as string;

        if (!sourcedId) throw new Error("sourcedId não encontrado no XML.");
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
        if (!disciplineData) throw new Error(`Disciplina para a UA ${learningUnitId} não encontrada.`);

        const { error: upsertError } = await supabaseAdmin
            .from('student_grades')
            .upsert({
                enrollment_id: enrollmentId,
                learning_unit_id: learningUnitId,
                student_id: studentProfileId,
                discipline_id: disciplineData.discipline_id,
                grade: grade,
                attempt_number: 1
            }, { onConflict: 'student_id,learning_unit_id,attempt_number' });
            
        if (upsertError) throw upsertError;

        console.log("log: ✅ Nota salva com sucesso no banco de dados!");

        const successResponseXML = createLtiResponse(messageId, 'success', `Score for ${sourcedId} is now ${score}`);
        return new Response(successResponseXML, { headers: { 'Content-Type': 'application/xml' } });

    } catch (error) {
        console.error("log: 💥 Erro CRÍTICO:", error.message);
        const errorResponseXML = createLtiResponse(messageId, 'failure', error.message);
        return new Response(errorResponseXML, { status: 500, headers: { 'Content-Type': 'application/xml' } });
    }
});