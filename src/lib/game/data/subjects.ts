import subjectRecords from './subjects.json';
import { milestones } from './records.ts';
import type { Milestone, Subject } from './types.ts';

export const subjects = subjectRecords as Subject[];

export const subjectOf = (m: Milestone): Subject => {
  const found = subjects.find((s) => s.id === m.subject);
  if (!found) throw new Error(`unknown subject: ${m.subject}`);
  return found;
};

export const milestonesOf = (subjectId: string): Milestone[] =>
  milestones.filter((m) => m.subject === subjectId);
