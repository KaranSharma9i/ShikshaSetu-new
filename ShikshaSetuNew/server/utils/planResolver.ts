export type PlanTier = 'FREE' | 'STANDARD' | 'PRO';

export const PLAN_LIMITS: Record<PlanTier, number> = {
  FREE: 0,
  STANDARD: 6,
  PRO: 10,
};

export function getPlanLimit(planTier: string): number {
  return PLAN_LIMITS[planTier as PlanTier] ?? 0;
}

export function isValidPaidPlan(planTier: string): boolean {
  return planTier === 'STANDARD' || planTier === 'PRO';
}
