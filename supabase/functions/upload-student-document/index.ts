import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode } from 'https://deno.land/std@0.177.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Função Auxiliar para criar o JWT ---
async function createGoogleJwt(email: string, privateKey: string, scopes: string[]) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: email, scope: scopes.join(' '), aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now }
  const encodedHeader = encode(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = encode(new TextEncoder().encode(JSON.stringify(payload)))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const keyData = atob(privateKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, ''))
  const keyBuffer = new Uint8Array(keyData.length).map((_, i) => keyData.charCodeAt(i))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const encodedSignature = encode(new Uint8Array(signature))
  return `${signingInput}.${encodedSignature}`
}
// --- Fim da Função Auxiliar ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    console.log('log: Função chamada. vFinal-BuscaOtimizada')
    const credsJson = Deno.env.get('GOOGLE_DRIVE_CREDENTIALS')
    if (!credsJson) throw new Error('Variável GOOGLE_DRIVE_CREDENTIALS não encontrada.')
    const credentials = JSON.parse(credsJson)
    const PARENT_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_PARENT_FOLDER_ID')
    if (!PARENT_FOLDER_ID) throw new Error('Variável GOOGLE_DRIVE_PARENT_FOLDER_ID não encontrada.')
    const { fileData, fileType, documentType, studentProfile } = await req.json()
    if (!fileData || !fileType || !documentType || !studentProfile) {
      throw new Error('Faltam parâmetros na requisição.')
    }
    const jwt = await createGoogleJwt(credentials.client_email, credentials.private_key, ['https://www.googleapis.com/auth/drive'])
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) throw new Error(tokenData.error_description)
    const accessToken = tokenData.access_token
    console.log('log: Token de acesso do Google obtido com sucesso.')
    const studentFolderName = `${studentProfile.full_name} - ${studentProfile.id}`
    
    // --- CORREÇÃO NA LÓGICA DE BUSCA ---
    const query = `mimeType='application/vnd.google-apps.folder' and name='${studentFolderName.replace(/'/g, "\\'")}' and '${PARENT_FOLDER_ID}' in parents and trashed=false`
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`
    
    const searchResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    // --- FIM DA CORREÇÃO ---

    const searchResult = await searchResponse.json()
    let studentFolderId: string
    if (searchResult.files && searchResult.files.length > 0) {
      studentFolderId = searchResult.files[0].id
      console.log(`log: Pasta do aluno encontrada. ID: ${studentFolderId}`)
    } else {
      console.log('log: Pasta do aluno não encontrada, criando...')
      const folderMetadata = { name: studentFolderName, mimeType: 'application/vnd.google-apps.folder', parents: [PARENT_FOLDER_ID] }
      const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(folderMetadata)
      })
      const folderResult = await createFolderResponse.json()
      if (!createFolderResponse.ok) throw new Error(folderResult.error.message || 'Erro ao criar pasta')
      studentFolderId = folderResult.id
      console.log(`log: Pasta do aluno criada com sucesso. ID: ${studentFolderId}`)
    }

    const fileContent = atob(fileData.split(',')[1])
    const fileArray = new Uint8Array(fileContent.length).map((_, i) => fileContent.charCodeAt(i))
    const uploadMetadata = { name: `${documentType} - ${new Date().toISOString()}.${fileType.split('/')[1] || 'bin'}`, parents: [studentFolderId] }
    const boundary = '----BOUNDARY' + Math.random().toString(36).substring(2);
    const encoder = new TextEncoder()
    const metadataPart = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(uploadMetadata)}\r\n--${boundary}\r\nContent-Type: ${fileType}\r\n\r\n`)
    const closingPart = encoder.encode(`\r\n--${boundary}--`)
    const body = new Uint8Array(metadataPart.length + fileArray.length + closingPart.length);
    body.set(metadataPart);
    body.set(fileArray, metadataPart.length);
    body.set(closingPart, metadataPart.length + fileArray.length);
    const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: body,
    })
    const uploadResult = await uploadResponse.json()
    if (!uploadResponse.ok) throw new Error(uploadResult.error.message || JSON.stringify(uploadResult))
    console.log('log: Arquivo enviado para o Drive com sucesso.')
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado no Supabase.')
    const { data: latestEnrollment, error: enrollmentError } = await supabaseClient.from('enrollments').select('id').eq('student_id', studentProfile.id).order('created_at', { ascending: false }).limit(1).single()
    if (enrollmentError) throw new Error(`Erro ao buscar matrícula: ${enrollmentError.message}`)
    const { error: dbError } = await supabaseClient.from('student_documents').upsert({
        user_id: studentProfile.id,
        enrollment_id: latestEnrollment.id,
        document_type: documentType,
        status: 'pending',
        file_path: uploadResult.webViewLink,
    }, { onConflict: 'user_id, enrollment_id, document_type' })
    if (dbError) throw dbError
    console.log('log: Registro do documento salvo no Supabase.')
    return new Response(JSON.stringify({ success: true, file: uploadResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('log: Erro na função:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})