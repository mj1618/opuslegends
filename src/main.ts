/**
 * Entry point: create the Game, expose the test API, start the render loop.
 * See CLAUDE.md "Architecture" for the module map.
 */
import { installTestApi } from './debug/testApi';
import { Game } from './game/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
installTestApi(game);
canvas.focus();

function loop(): void {
  game.frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
void game.load();
