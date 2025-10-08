import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { google } from 'googleapis'

// Pega as credenciais e o ID da pasta dos segredos do Supabase
const FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
const SERVICE_ACCOUNT_JSON = JSON.parse(Deno.env.get('GOOGLE_DRIVE_CREDENTIALS') || '{}')

// Função para converter string base64 em um Uint8Array
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { fileContent, contentType, fileName } = await req.json()
    if (!fileContent || !contentType || !fileName) {
      throw new Error('Informações do arquivo ausentes.')
    }

    // 1. Autentica com o Google
    const auth = new google.auth.JWT(
      SERVICE_ACCOUNT_JSON.client_email,
      undefined,
      SERVICE_ACCOUNT_JSON.private_key,
      ['https://www.googleapis.com/auth/drive']
    )

    const drive = google.drive({ version: 'v3', auth })

    // 2. Prepara o arquivo para upload
    const fileBytes = base64ToUint8Array(fileContent)
    const fileBlob = new Blob([fileBytes], { type: contentType })

    const media = {
      mimeType: contentType,
      // @ts-ignore - A biblioteca aceita o stream do Blob
      body: fileBlob.stream(), 
    }
    
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    }
    
    // 3. Faz o upload
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    })

    if (!file.data.id) {
        throw new Error('Falha ao obter o ID do arquivo após o upload.');
    }

    // 4. Torna o arquivo público
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // 5. Retorna o link de visualização
    return new Response(JSON.stringify({ imageUrl: file.data.webViewLink }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (error) {
    console.error('Erro na função de upload:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})