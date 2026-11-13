import Anthropic from '@anthropic-ai/sdk';

// Reads the check number, amount and payer from a photo of a check taken at
// the door, so Jen can match it to AMO without typing. The values are saved
// as "detected" and shown for her to confirm; they never mark anyone paid on
// their own.
//
// Optional: only runs when ANTHROPIC_API_KEY is set in Vercel. Without it,
// photos are still stored and the check-in team can type the number/amount.

export type CheckReading = {
  check_number: string | null;
  amount: number | null;
  payer: string | null;
};

const SCHEMA = {
  type: 'object',
  properties: {
    check_number: { type: ['string', 'null'], description: 'Check number (top right, or in the MICR line at the bottom). Digits only.' },
    amount: { type: ['number', 'null'], description: 'Amount in US dollars, from the numeric amount box.' },
    payer: { type: ['string', 'null'], description: 'Account holder / payer name printed on the check (often a township or a person).' },
  },
  required: ['check_number', 'amount', 'payer'],
  additionalProperties: false,
} as const;

export async function readCheckPhoto(jpeg: Buffer): Promise<CheckReading | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2000,
    // Simple extraction: low effort keeps it fast and cheap.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // If the request is ever declined, let the API retry it on its
    // recommended fallback model instead of returning nothing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
          {
            type: 'text',
            text:
              'This is a photo of a paper check given as payment for a training event. Read the check number, ' +
              'the dollar amount and the payer name. Use null for anything you cannot read clearly; do not guess. ' +
              'Never include bank account or routing numbers.',
          },
        ],
      },
    ],
  } as any);

  if (response.stop_reason === 'refusal') return null;
  const text = response.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('');
  try {
    const parsed = JSON.parse(text);
    const num = parsed.check_number ? String(parsed.check_number).replace(/\D/g, '').slice(0, 20) : null;
    const amount = typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) ? Math.round(parsed.amount * 100) / 100 : null;
    const payer = parsed.payer ? String(parsed.payer).slice(0, 120) : null;
    return { check_number: num || null, amount, payer };
  } catch {
    return null;
  }
}
