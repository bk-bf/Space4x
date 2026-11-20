import subjectRecords from './subjects.json';
import { projects } from './records.ts';
import type { Project, Subject } from './types.ts';

export const subjects = subjectRecords as Subject[];

export const subjectOf = (p: Project): Subject => {
  const found = subjects.find((s) => s.id === p.subject);
  if (!found) throw new Error(`unknown subject: ${p.subject}`);
  return found;
};

export const projectsOf = (subjectId: string): Project[] => projects.filter((p) => p.subject === subjectId);
