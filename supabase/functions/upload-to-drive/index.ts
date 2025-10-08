import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(clientEmail: string, privateKey: string) {
  const jwtHeader = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encodedJwt = `${base64url(JSON.stringify(jwtHeader))}.${base64url(JSON.stringify(jwtPayload))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(encodedJwt));
  const signedJwt = `${encodedJwt}.${base64url(new Uint8Array(signature))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToBinary(pem: string) {
  const base64 = pem.replace(/-+(BEGIN|END) PRIVATE KEY-+/g, '').replace(/\s/g, '');
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

function base64url(data: string | Uint8Array) {
  let str = typeof data === 'string' ? data : String.fromCharCode.apply(null, data as unknown as number[]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
    const SERVICE_ACCOUNT_JSON_STRING = Deno.env.get('GOOGLE_DRIVE_CREDENTIALS')
    if (!SERVICE_ACCOUNT_JSON_STRING) throw new Error("O segredo 'GOOGLE_DRIVE_CREDENTIALS' não foi encontrado.")
    const SERVICE_ACCOUNT_JSON = JSON.parse(SERVICE_ACCOUNT_JSON_STRING)

    const { fileContent, contentType, fileName } = await req.json()
    if (!fileContent || !contentType || !fileName) throw new Error('Informações do arquivo ausentes.')

    const accessToken = await getAccessToken(SERVICE_ACCOUNT_JSON.client_email, SERVICE_ACCOUNT_JSON.private_key);
    if (!accessToken) throw new Error("Não foi possível obter o token de acesso do Google.");

    const metadata = { name: fileName, parents: [FOLDER_ID] };
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);
    
    const bodyArray = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${contentType}`,
        '',
        atob(fileContent),
        `--${boundary}--`,
    ];
    const body = bodyArray.join('\r\n');

    // ### A CORREÇÃO ESTÁ AQUI ###
    // Adicionamos 'supportsAllDrives=true' para indicar que estamos trabalhando com Drives Compartilhados
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body
    });

    const result = await uploadResponse.json();
    if (result.error) throw new Error(result.error.message);
    const fileId = result.id;

    // E aqui também
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    // E finalmente aqui
    const fileDetails = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink&supportsAllDrives=true`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const { webViewLink } = await fileDetails.json();

    return new Response(JSON.stringify({ imageUrl: webViewLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro na função de upload:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})