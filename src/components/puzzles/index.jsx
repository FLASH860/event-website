import Jigsaw from './Jigsaw'
import PowerLine from './PowerLine'
import Reboot from './Reboot'
import Defuse from './Defuse'

const BY_QUESTION = { 1: Jigsaw, 2: PowerLine, 3: Reboot, 4: Defuse }

// The hands-on part of each question: shown above the answer box while the question is unsolved.
export default function Puzzle({ index, solved, seed }) {
  const Game = BY_QUESTION[index]
  return Game ? <Game solved={solved} seed={seed} /> : null
}
