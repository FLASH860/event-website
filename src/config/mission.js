// Mission mechanics CONFIGURATION (labels and defaults). The four questions, answers, hints and locations are NOT here:
// organisers enter them in the event-head interface and they live in the backend.
export const MISSION = { questionCount: 4 }

// How a team earns access to the next question. Chosen by organisers (server setting); the frontend only displays it.
export const PROGRESSION_MODES = {
  answer: { label: 'Correct answer only', text: 'The next question unlocks as soon as the server accepts a correct answer.' },
  recovery: { label: 'Component recovery only', text: 'The next question unlocks once the component recovery for this question is verified. Questions without a required component unlock on a correct answer.' },
  answer_and_approval: { label: 'Correct answer + organiser-approved recovery', text: 'The next question unlocks only after a correct answer AND an organiser approves the component recovery.' },
}

export const HINT_REVEAL = {
  on_correct_answer: { label: 'When the question is solved', text: 'The location hint appears as soon as the server accepts a correct answer.' },
  organiser_release: { label: 'When an organiser releases it', text: 'The location hint stays hidden until an organiser releases it for your team.' },
}

export const COMPONENT_METHODS = {
  qr: 'Scan the QR code at the approved location',
  organiser_confirms: 'Show the component to an organiser or volunteer',
}

export const QUESTION_TYPES = { text: 'Text answer', choice: 'Multiple choice' }

export const RESULT_COPY = {
  incorrect: 'That answer is not correct.',
  already_solved: 'You have already solved this question.',
  attempts_exhausted: 'No attempts left for this question.',
  locked: 'This question is not unlocked for your team.',
  closed: 'Mission window closed, Agent.',
  too_fast: 'Slow down, Agent. Wait a couple of seconds between attempts.',
  network: 'Could not reach the server. Your answer was not recorded; try again.',
}

// Answer feedback wording (presentation only; the server still decides every outcome).
// `label` is a small status word so meaning never depends on colour alone.
export const FEEDBACK = {
  incorrect: { tone: 'bad', label: 'Response · Incorrect', main: 'INCORRECT, AGENT.', sub: 'Reassess your answer and try again.' },
  empty: { tone: 'bad', label: 'Input required', main: 'AGENT, AN ANSWER IS REQUIRED.' },
  verifying: { tone: 'wait', label: 'Verifying', main: 'VERIFYING RESPONSE...' },
  error: { tone: 'bad', label: 'Transmission', main: 'TRANSMISSION FAILED. TRY AGAIN.' },
  complete: { tone: 'quiet', label: 'Complete', main: 'OBJECTIVE ALREADY COMPLETE.' },
}
// Success sequence wording (presentation only). Numbers are generated, never hardcoded per question.
export const pad2 = (n) => String(n).padStart(2, '0')
export const SEQUENCE = {
  received: { label: 'Response · Verified', main: 'TRANSMISSION RECEIVED.', sub: 'Mission Control has verified your response.' },
  objective: (n) => `OBJECTIVE ${pad2(n)} COMPLETE.`,
  next: { main: 'NEXT OBJECTIVE AVAILABLE.', sub: (n) => `Agent, proceed to Question ${pad2(n)}.`, cta: (n) => `PROCEED TO QUESTION ${pad2(n)} →` },
  final: {
    kicker: 'Stage 1 · Digital Transmission',
    main: 'CONGRATULATIONS, AGENT.', sub2: 'DIGITAL TRANSMISSION COMPLETE.',
    body: 'All four objectives have been completed. Mission Control has received and verified your transmissions.',
    deploy: 'FIELD DEPLOYMENT AUTHORISED.',
    deployBody: 'Your next assignment begins on campus. Your final transmission contains intelligence identifying the location of a designated robot component.',
    instructions: 'Study your intelligence carefully. Follow the authorised clue to locate the designated robot component. Proceed only through approved routes and checkpoints. Do not enter restricted areas or interfere with equipment, property, or other teams.',
    signoff: 'YOUR NEXT MISSION BEGINS IN THE FIELD. GOOD LUCK, AGENT.',
    review: 'REVIEW FIELD INTELLIGENCE →', acknowledge: 'ACKNOWLEDGE INTELLIGENCE', acknowledged: 'INTELLIGENCE ACKNOWLEDGED',
    unavailable: 'Not yet released. Your intelligence will appear here when Mission Control releases it to your team.',
  },
  intel: { label: 'LOCATION INTELLIGENCE', field: 'Proceed only through approved routes and checkpoints.' },
}
