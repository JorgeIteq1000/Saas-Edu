// supabase/functions/fetch-cep/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log("log: 📞 Função 'fetch-cep' foi chamada.");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    console.log(`log: CEP recebido para busca: ${cep}`);
    if (!cep) throw new Error('CEP não foi fornecido no corpo da requisição.');

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    console.log(`log: Resposta da API ViaCEP - Status: ${response.status}`);
    if (!response.ok) throw new Error('Falha ao buscar o CEP na API externa.');

    const data = await response.json();
    console.log('log: ✅ Endereço encontrado:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('log: 💥 Erro na função fetch-cep:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});