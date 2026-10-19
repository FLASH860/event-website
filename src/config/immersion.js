// Presentation-only settings for cinematic moments. None of this affects competition logic.
export const IMMERSION = {
  selfDestruct: {
    seconds: 5,
    onFirstLogin: false, // superseded by the six-slide mission briefing (src/components/briefing)
    rounds: [5],        // round numbers whose briefing plays the sequence once (e.g. [3, 5]); [] for none
    enabled: true,      // master switch: false disables the sequence everywhere
  },
  easterEggs: {
    enabled: true,
    chance: 0.08, // only after confirmed success moments, never on errors
  },
}
