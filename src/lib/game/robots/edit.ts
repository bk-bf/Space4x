import { figures } from './parts.ts';
import { robotStats, type Unlocked } from './stats.ts';
import type { RobotDesign, RobotPartCount } from './types.ts';

export const MAX_ROBOT_COUNT = 9;

export const newRobot = (id: string, name = 'New robot'): RobotDesign => ({
  id,
  name,
  parts: [],
  locked: false
});

export const robotCount = (design: RobotDesign, partId: string): number =>
  design.parts.find((p) => p.part === partId)?.count ?? 0;

export function setRobotCount(design: RobotDesign, partId: string, count: number): RobotDesign {
  if (design.locked || !figures(partId)) return design;
  const n = Math.max(0, Math.min(MAX_ROBOT_COUNT, Math.round(count)));
  const exists = design.parts.some((p) => p.part === partId);
  const parts: RobotPartCount[] = exists
    ? design.parts.map((p) => (p.part === partId ? { ...p, count: n } : p))
    : [...design.parts, { part: partId, count: n }];
  return { ...design, parts: parts.filter((p) => p.count > 0) };
}

export const addRobotPart = (design: RobotDesign, partId: string): RobotDesign =>
  setRobotCount(design, partId, robotCount(design, partId) + 1);

export const removeRobotPart = (design: RobotDesign, partId: string): RobotDesign =>
  setRobotCount(design, partId, robotCount(design, partId) - 1);

export const renameRobot = (design: RobotDesign, name: string): RobotDesign =>
  design.locked ? design : { ...design, name };

export const canLockRobot = (design: RobotDesign, unlocked?: Unlocked): boolean =>
  !design.locked && robotStats(design, unlocked).errors === 0;

export const lockRobot = (design: RobotDesign, unlocked?: Unlocked): RobotDesign =>
  canLockRobot(design, unlocked) ? { ...design, locked: true } : design;

export const copyRobot = (design: RobotDesign, id: string): RobotDesign => ({
  ...design,
  id,
  name: `${design.name} copy`,
  locked: false
});
