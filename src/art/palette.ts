/**
 * OpusLegends palette (docs/DESIGN.md §2-3). Hex strings + pre-parsed RGB tuples.
 *
 * SACRED colours (never used for anything else):
 *   player  : CLAW orange, CARAPACE ultramarine        -> Crabbe only
 *   reward  : HERRING silver + GOLD glint, SEA_GLASS   -> herring, floats, Perfect sparkles
 *   danger  : URCHIN black + MAGENTA                   -> urchins, cue tips, Slicker eyes, Big Jim's spikes/pincer edges
 */
import { hex } from './core/color';

export const PAL = {
  // --- player (sacred)
  claw: '#FF7A1A',
  clawTeeth: '#FFF1D6',
  clawUnder: '#C4501A',
  clawHi: '#FFB066',
  carapace: '#2D3FA6',
  carapaceTop: '#4A63D9',
  carapaceDeep: '#1C2872',
  // --- reward (sacred)
  herring: '#DDE7EE',
  herringBack: '#7E93A8',
  gold: '#FFD34D',
  seaGlass: '#7FE3B0',
  // --- danger (sacred)
  urchin: '#1A1420',
  magenta: '#FF2E88',
  // --- chalk
  chalkBone: '#F2EEE3',
  chalkShade: '#C9C3B4',
  chalkDeep: '#8F8A80',
  flint: '#2A2B33',
  // --- sea
  seaShallow: '#6FD6C8',
  seaTeal: '#1FA3B0',
  seaDeep: '#0E5E6B',
  foam: '#E8FBF7',
  // --- wood / boats
  wood: '#8A6A4F',
  woodDark: '#4E3A2C',
  woodLight: '#B08D68',
  oxblood: '#7E1F24',
  pennantBlack: '#1E1A1C',
  // --- Big Jim
  jimOchre: '#9A7B55',
  jimShell: '#8C2F2A',
  kelp: '#3E5B3A',
  // --- chart (frame / finale)
  parchment: '#EFE2C0',
  ink: '#2B2320',
  fadedRed: '#B5523B',
  seaWash: '#9CC8C0',
  // --- supporting (non-sacred) colours
  outline: '#1B1726', // universal character ink line
  turf: '#6E9A4A',
  turfLight: '#A6C86A',
  turfDark: '#3F6233',
  gullWhite: '#F4F2EC',
  gullGrey: '#9AA0A8',
  gullBack: '#2E2F36',
  gullBeak: '#F2C230',
  capTweed: '#5A5048',
  cueWood: '#C79A5B',
  slicker: '#F2C21B',
  slickerShade: '#B9860F',
  wax: '#EDE6D8',
  beaconRed: '#C8453A',
  beaconGreen: '#2E8B57',
  lamp: '#FFE9A8',
  white: '#FFFFFF',
} as const;

export type PalKey = keyof typeof PAL;

/** Pre-parsed RGB tuples of every palette entry. */
export const RGBP = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)])) as Record<
  PalKey,
  readonly [number, number, number]
>;

/**
 * CUE-FU palette (docs/DESIGN.md §2-3): a scratched 1973 grindhouse kung-fu double feature on 42nd St.
 * SACRED: tangerine (+shade, cream stripe) = Kid Cue only · gold = reward · lacquer red (+hot edge) = danger.
 * Background rule: no hue within ±12° of tangerine above 55% saturation near the play band.
 */
export const CF = {
  // hero (sacred)
  tangerine: '#FF8A1F',
  tangerineShade: '#C45A0E',
  tangerineHi: '#FFB066',
  cream: '#FFF6E8',
  creamShade: '#D9CDB8',
  cueMaple: '#E7C48A',
  cueMapleShade: '#B8925A',
  cueButt: '#2A1E16',
  // reward (sacred)
  gold: '#E0B64A',
  goldHi: '#FFE08A',
  // danger (sacred)
  lacquer: '#B3201B',
  hotEdge: '#FF4A3D',
  // film
  filmBlack: '#1A1410',
  filmHi: '#E9D8B4',
  beamHaze: '#F8F1DC',
  subtitle: '#F4EFE2',
  // street
  asphalt: '#2B2530',
  brick: '#6B3A2E',
  neonJade: '#46D6A0',
  neonRose: '#E0569B',
  bulb: '#FFE9C2',
  // dojo
  timber: '#8A6A4F',
  timberDark: '#4E3A2C',
  paperWall: '#EFE6CF',
  iron: '#3A3A42',
  // bath-house
  tileJade: '#2FA37A',
  tileDeep: '#0F4A3E',
  grout: '#9FB8AE',
  steam: '#DDEFE8',
  copper: '#B8734A',
  // pool room
  felt: '#1F6B45',
  feltShadow: '#0E3A26',
  lampPool: '#F6E7B0',
  walnut: '#5A3A26',
  smoke: '#8C8A7A',
  // Big Jim / velvet hall
  fig: '#5E2B4E',
  velvet: '#8A4A76',
  figShadow: '#2E1428',
  chrome: '#C9D3DA',
  cinnabar: '#7E3A30',
  // sunset
  sunCream: '#FFE9C2',
  coral: '#F2856B',
  rose: '#E8577A',
  // theatre frame
  seats: '#0D0A08',
  curtain: '#4A1A20',
  houseAmber: '#C98A3A',
  // supporting (non-sacred)
  skin: '#C98E68',
  skinShade: '#9A6446',
  hair: '#1A1410',
  jade: '#2FA37A',
} as const;
