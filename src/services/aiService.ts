import { ExtractedTransaction } from '../types/models';

const OLLAMA_URL = 'https://ollama.com/api/chat';

const EXTRACTION_PROMPT = `Você está processando uma foto de um caderno financeiro de condomínio brasileiro.
Cada linha do caderno contém: DATA, DESCRIÇÃO DA TRANSAÇÃO, e duas colunas de valor:
- A primeira coluna de valor (à esquerda) representa RECEITAS (entradas)
- A segunda coluna de valor (à direita) representa DESPESAS (saídas)
Apenas uma das duas colunas estará preenchida por linha.

A Coluna de DATA contém somente o dia e o mês (ex: "15/08"), mas o ano não está presente. 
O ano está presente no topo da página, num campo em que fica presente o MÊS/ANO. Exemplo: "Agosto/2026".
Use o ano presente no topo da página para completar as datas das transações. 
Se o ano não estiver legível, use 2026 para a data.

Extraia TODAS as transações visíveis na imagem.
Retorne APENAS um array JSON válido, sem markdown, sem explicações, sem texto antes ou depois.
Cada item do array deve ter exatamente este formato:
{ "date": "DD/MM/YYYY", "description": "string", "amount": number, "type": "revenue" ou "expense" }

Regras:
- Valor na coluna da ESQUERDA = "revenue"
- Valor na coluna da DIREITA = "expense"
- amount deve ser um número positivo (ex: 150.00)
- Se a data estiver ilegível ou ausente, use null
- Se o valor estiver ilegível, use null
- Inclua todas as linhas que conseguir ler
- Separe centavos com ponto (ex: 1500.50)`;

export async function extractTransactionsFromImage(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png',
  model: string,
  apiKey: string,
  systemPrompt?: string | null,
): Promise<ExtractedTransaction[]> {
  const messages: object[] = [];

  if (systemPrompt?.trim()) {
    messages.push({ role: 'system', content: systemPrompt.trim() });
  }

  messages.push({ role: 'user', content: EXTRACTION_PROMPT, images: [base64] });

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, stream: false, messages }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama retornou erro ${response.status}: ${body}`);
  }

  const json = await response.json();
  const text: string = json?.message?.content ?? '';

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed: ExtractedTransaction[] = JSON.parse(cleaned);

  return parsed.map((item) => ({
    date: item.date ?? null,
    description: item.description ?? '',
    amount: item.amount !== null && !isNaN(Number(item.amount)) ? Number(item.amount) : null,
    type: item.type === 'revenue' ? 'revenue' : 'expense',
  }));
}
