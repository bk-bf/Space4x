import { project } from './records.ts';

export const projectName = (number: number): string => project(number).name;
