import { registerSystem } from '../systems';

registerSystem('orbits', (game, dt) => {
  for (const b of game.world.bodies) b.angle = (b.angle + b.angularSpeed * dt) % (Math.PI * 2);
});
