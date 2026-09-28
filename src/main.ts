/**
 * Entry point: pick the song (?song=edit|full|placeholder; falls back to the placeholder if the
 * licensed recording is missing), create the Game, expose the test API, start the render loop.
 * See CLAUDE.md "Architecture" for the module map.
 */
import { parseSongChoice, selectSong, showSongNote } from './audio/songs';
import { installTestApi } from './debug/testApi';
import { params } from './engine/params';
import { Game } from './game/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const selection = await selectSong(parseSongChoice(params.song));
showSongNote(selection.note);
const game = new Game(canvas, selection.song);
installTestApi(game);
canvas.focus();

function loop(): void {
  game.frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
void game.load();
