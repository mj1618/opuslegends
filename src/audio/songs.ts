/**
 * Song catalog + selection (`?song=edit|full|placeholder`, default `edit`).
 *
 *   edit        the ORIGINAL recording, 2:04 level edit (86 bars, 344 beats; docs/music/original_edit.md)
 *               audio: audio/licensed/jim_edit.ogg (+ overlay stems shouts/stomps/cowbell)
 *   full        the full original (119 bars, 476 beats, fades out)
 *   placeholder the synthesized 164 BPM shuffle (runs with no assets at all)
 *
 * The beat maps are COMMITTED data (assets/audio/*.beatmap.json) and are bundled: `jimEdit` is a
 * ready SongDef (tempo map, sections, lanes) that level code can import synchronously for authoring,
 * e.g. `jimEdit.lane('snare').between(96, 128)`. The recording itself is LICENSED and gitignored
 * (assets/audio/licensed/, served at `audio/licensed/…` by tools/vite/audioAssets.mjs). If it's
 * missing (fresh clone) selectSong() falls back to the placeholder and returns a note to show.
 */
import editMap from '../../assets/audio/jim_edit.beatmap.json';
import { placeholderSong } from './placeholderSong';
import { songFromBeatmap, type BeatmapJson, type SongDef } from './song';

export type SongChoice = 'edit' | 'full' | 'placeholder';

/** Runtime URL base of assets/audio/ (relative, so it works under any hosting sub-path). */
export const AUDIO_BASE = 'audio/';

/** The original recording's level edit (bundled beat map; the audio is fetched at load time). */
export const jimEdit: SongDef = songFromBeatmap(editMap as unknown as BeatmapJson, AUDIO_BASE);

async function loadJimFull(): Promise<SongDef> {
  const m = await import('../../assets/audio/jim_original.beatmap.json');
  return songFromBeatmap((m.default ?? m) as unknown as BeatmapJson, AUDIO_BASE);
}

export interface SongSelection {
  song: SongDef;
  requested: SongChoice;
  choice: SongChoice;
  /** non-empty when the request couldn't be honoured (shown on screen) */
  note: string;
}

export function parseSongChoice(v: string | null | undefined): SongChoice {
  return v === 'full' || v === 'placeholder' || v === 'edit' ? v : 'edit';
}

/**
 * Licensed files actually available (audio/licensed.json, written by tools/vite/audioAssets.mjs).
 * A manifest instead of probing the file: a 404 would show up as a console error.
 */
async function licensedFiles(): Promise<Set<string>> {
  try {
    const r = await fetch(AUDIO_BASE + 'licensed.json', { cache: 'no-store' });
    if (!r.ok) return new Set();
    const j = (await r.json()) as { files?: string[] };
    return new Set((j.files ?? []).map((f) => AUDIO_BASE + 'licensed/' + f));
  } catch {
    return new Set();
  }
}

/** Prefer the OGG (the MP3 decodes 1105 samples late in decoders that ignore its LAME header). */
function preferredFormat(url: string): string {
  if (typeof Audio === 'undefined') return url;
  const ogg = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
  return ogg ? url : url.replace(/\.ogg$/, '.mp3');
}

/**
 * Resolve the requested song. File songs need their licensed recording; if it's missing, fall back
 * to the placeholder with a note (the game still runs on a fresh clone).
 */
export async function selectSong(requested: SongChoice): Promise<SongSelection> {
  if (requested === 'placeholder') return { song: placeholderSong, requested, choice: 'placeholder', note: '' };
  let song: SongDef;
  try {
    song = requested === 'full' ? await loadJimFull() : jimEdit;
  } catch (e) {
    return { song: placeholderSong, requested, choice: 'placeholder', note: `Could not load the ${requested} beat map (${String(e)}) — playing the synth placeholder.` };
  }
  if (song.source.kind === 'file') {
    const ogg = song.source.url;
    const url = preferredFormat(ogg);
    const have = await licensedFiles();
    const found = have.has(url) ? url : have.has(ogg) ? ogg : null;
    if (!found) {
      return {
        song: placeholderSong,
        requested,
        choice: 'placeholder',
        note:
          `Licensed recording not found (assets/audio/${ogg.slice(AUDIO_BASE.length)}) — playing the synth placeholder. ` +
          'Put the licensed files in assets/audio/licensed/ (never commit them); see CLAUDE.md "Licensed audio".',
      };
    }
    song = { ...song, source: { kind: 'file', url: found } };
  }
  return { song, requested, choice: requested, note: '' };
}

/** A small on-screen DOM note (e.g. "licensed recording missing"), independent of the canvas renderer. */
export function showSongNote(text: string, seconds = 14): void {
  if (!text || typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = '♪ ' + text;
  el.setAttribute('role', 'status');
  el.style.cssText =
    'position:fixed;left:50%;top:12px;transform:translateX(-50%);max-width:min(92vw,900px);z-index:10;' +
    'padding:8px 14px;border-radius:6px;background:rgba(20,14,10,.88);color:#F4EFE2;border:1px solid #E0B64A;' +
    'font:600 14px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;transition:opacity .8s';
  document.body.appendChild(el);
  console.warn(text);
  setTimeout(() => (el.style.opacity = '0'), seconds * 1000);
  setTimeout(() => el.remove(), seconds * 1000 + 1000);
}
