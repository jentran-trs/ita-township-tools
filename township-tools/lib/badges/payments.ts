import { createServerSupabaseClient } from '@/lib/supabase';

export type PaymentMethod = 'check' | 'card' | 'admin' | 'amo';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  check: 'Check',
  card: 'Credit card',
  admin: 'Marked paid',
  amo: 'Paid in AMO',
};

/**
 * Mark a registrant paid and release any certificate held for payment, so it
 * becomes downloadable straight away.
 */
export async function markRegistrantPaid(registrantId: string, method: PaymentMethod) {
  const supabase = createServerSupabaseClient();
  const { data: reg, error } = await supabase
    .from('cert_registrants')
    .update({ payment_status: 'paid', payment_method: method })
    .eq('id', registrantId)
    .select('id, certificate_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (reg?.certificate_id) {
    await supabase.from('certificates').update({ payment_hold: false }).eq('id', reg.certificate_id);
  }
  return reg;
}
