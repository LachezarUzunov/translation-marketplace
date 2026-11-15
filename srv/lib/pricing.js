/**
 * Pure pricing logic: no database, no CAP request. Easy to unit test.
 *
 * All math is done in integer cents to avoid floating point errors
 * (0.1 + 0.2 !== 0.3 in JavaScript).
 */

/**
 * @param {number|string} pricePerWord  e.g. "0.080" (Decimals arrive as strings)
 * @param {number} wordCount
 * @param {{ rate: number, minimum: number }} commission  from cds.env.marketplace.commission
 */
export function calculatePrice(pricePerWord, wordCount, { rate, minimum }) {
  // pricePerWord has 3 decimals -> exact integer in thousandths of a dollar
  const priceMilli = Math.round(Number(pricePerWord) * 1000);
  const translatorCents = Math.round((priceMilli * wordCount) / 10);

  const commissionCents = Math.max(
    Math.round(translatorCents * rate),
    Math.round(minimum * 100),
  );

  return {
    translatorPrice: translatorCents / 100,
    commission: commissionCents / 100,
    buyerPrice: (translatorCents + commissionCents) / 100,
  };
}
