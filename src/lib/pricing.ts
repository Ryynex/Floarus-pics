/**
 * Single source of truth for pricing so the API pre-check, the remaining-credit
 * maths, and every UI toast can never drift apart.
 *
 * The server still owns the authoritative cost: the value passed to
 * `deduct_balance_for_generation` is always read from here, never from the
 * client payload.
 */
export const CREDIT_PRICE_INR = 49;

/** Convert a rupee balance into whole/fractional credits (1 credit = one generation). */
export function creditsFromBalance(balanceInr: number): number {
  return Number((balanceInr / CREDIT_PRICE_INR).toFixed(1));
}
