export const SUBMISSION_DEADLINE_PASSED_MESSAGE =
  'The submission deadline for this challenge has passed.';

export function shouldHoldForFutureStart(startAt: string | null, now: Date): boolean {
  return startAt !== null && new Date(startAt).getTime() > now.getTime();
}

export function reviewPhaseForDeadline(stageCount: number, currentPhase: number): 6 | 8 | null {
  if (stageCount === 2 && currentPhase === 5) return 6;
  if ((stageCount === 1 && currentPhase === 5) || currentPhase === 7) return 8;
  return null;
}

export function extensionCountError(previousExtensions: number, maximum: number): string | null {
  return previousExtensions >= maximum
    ? `This deadline has already been extended the maximum of ${maximum} times.`
    : null;
}
