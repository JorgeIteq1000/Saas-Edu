// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Função para realizar um POST para uma URL, criando um formulário dinâmico.
 * Usado para o redirecionamento LTI.
 * @param url A URL de destino para o POST.
 * @param params Um objeto com os parâmetros a serem enviados no corpo do formulário.
 * @param target O alvo da submissão do formulário (ex: '_blank' para nova aba).
 */
export function postToUrl(url: string, params: Record<string, string>, target = '_blank') {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.target = target;

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = params[key];
      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}