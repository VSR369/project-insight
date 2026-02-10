/**
 * Billing Service
 * Business logic for invoice generation, top-ups, and billing lifecycle.
 */

interface TopUpRequest {
  quantity: number;
  perChallengeFee: number;
  currencyCode: string;
}

interface TopUpValidation {
  isValid: boolean;
  totalAmount: number;
  reason?: string;
}

/**
 * Validate top-up request
 */
export function validateTopUp(request: TopUpRequest): TopUpValidation {
  if (request.quantity < 1 || request.quantity > 100) {
    return { isValid: false, totalAmount: 0, reason: 'Quantity must be between 1 and 100.' };
  }

  if (request.perChallengeFee <= 0) {
    return { isValid: false, totalAmount: 0, reason: 'Invalid per-challenge fee.' };
  }

  const totalAmount = Math.round(request.quantity * request.perChallengeFee * 100) / 100;
  return { isValid: true, totalAmount };
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(orgPrefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${orgPrefix}-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Determine invoice status based on dates
 */
export function computeInvoiceStatus(
  currentStatus: string,
  dueAt: string | null,
  paidAt: string | null
): string {
  if (paidAt) return 'paid';
  if (currentStatus === 'cancelled' || currentStatus === 'refunded') return currentStatus;
  if (dueAt && new Date(dueAt) < new Date()) return 'overdue';
  return currentStatus;
}

/**
 * Calculate prorated upgrade charge
 * Charges the difference between new and old tier for remaining days in period.
 */
export function calculateProratedCharge(params: {
  oldMonthlyFee: number;
  newMonthlyFee: number;
  periodStart: string;
  periodEnd: string;
}): { proratedAmount: number; remainingDays: number; totalDays: number } {
  const start = new Date(params.periodStart);
  const end = new Date(params.periodEnd);
  const now = new Date();

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const feeDifference = Math.max(0, params.newMonthlyFee - params.oldMonthlyFee);
  const dailyRate = feeDifference / totalDays;
  const proratedAmount = Math.round(dailyRate * remainingDays * 100) / 100;

  return { proratedAmount, remainingDays, totalDays };
}

/**
 * Calculate billing period usage summary
 */
export function computeUsageSummary(
  challengesUsed: number,
  challengeLimit: number | null,
  perChallengeFee: number
) {
  return {
    challengesUsed,
    challengeLimit,
    remaining: challengeLimit !== null ? Math.max(0, challengeLimit - challengesUsed) : null,
    usagePercentage: challengeLimit !== null && challengeLimit > 0
      ? Math.round((challengesUsed / challengeLimit) * 100)
      : null,
    estimatedCost: Math.round(challengesUsed * perChallengeFee * 100) / 100,
  };
}
