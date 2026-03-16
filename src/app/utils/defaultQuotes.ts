export interface DefaultQuoteSeed {
  text: string;
  author: string;
}

const DEFAULT_QUOTE_AUTHOR = 'Anonymous';

const quotePalette = [
  { bg_color: '#DBEAFE', text_color: '#1E3A8A', font_size: 15 },
  { bg_color: '#DCFCE7', text_color: '#166534', font_size: 15 },
  { bg_color: '#FEF3C7', text_color: '#92400E', font_size: 15 },
  { bg_color: '#FCE7F3', text_color: '#9D174D', font_size: 15 },
  { bg_color: '#EDE9FE', text_color: '#5B21B6', font_size: 15 },
  { bg_color: '#E0F2FE', text_color: '#075985', font_size: 15 },
];

export const defaultMotivationalQuotes: DefaultQuoteSeed[] = [
  { text: 'Success begins with showing up consistently, even on the days you do not feel ready.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Small progress each day builds the foundation for remarkable results.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Discipline will take you places that motivation alone cannot reach.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Your future changes when your daily habits change.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Do not wait for confidence. Start, and confidence will grow.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Every assignment finished on time is a vote for the person you want to become.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You are capable of more than your current excuses suggest.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Focus on effort today and results will follow tomorrow.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Consistency beats intensity when intensity does not last.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Your education is a tool. Learn how to use it well.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Hard days are part of the process, not proof that you should stop.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Stay committed to your goals long after the excitement fades.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'What you repeat daily becomes what you master.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The student who keeps going quietly often finishes strongest.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You do not need perfect conditions to begin improving.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'One focused hour can change the direction of your whole week.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Dreams become real when deadlines and discipline meet.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'If it matters to your future, give it your full attention.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Difficult subjects teach patience, and patience builds strength.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The best preparation for opportunity is work done in advance.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You are not behind. You are still building.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Choose progress over comparison.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'A calm mind and a clear plan solve more than panic ever will.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Your current effort is writing your future introduction.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Do the work now so your future self can thank you later.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Talent helps, but habits decide the long game.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Keep learning even when no one is watching.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You can be tired and still be determined.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The road to excellence is built with ordinary days used well.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Respect your goals enough to protect your time.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Improvement often looks slow until the results become impossible to ignore.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Do not fear starting small. Fear staying still.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Study with purpose, not just with pressure.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The effort you make today reduces the stress you face tomorrow.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Success is usually quiet, patient, and built over time.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Keep your standards high, even when your energy is low.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You grow every time you choose discipline over distraction.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'A strong routine can carry you through weak moments.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Your goals deserve better than inconsistent attention.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Learning becomes powerful when you stay curious and accountable.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'It is never wasted effort when you are building skill.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Make your work ethic stronger than your doubts.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The best way to feel prepared is to prepare.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Show up for your future before the results are visible.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Keep moving. Even slow steps create distance from where you started.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Pressure can sharpen you when you respond with discipline.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Education rewards patience, repetition, and honesty with yourself.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'A single day used wisely can repair a week that felt off track.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The habit of finishing what you start is a superpower.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The student who plans wins more often than the student who guesses.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'You do not need to know everything today. You just need to keep learning.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Protect your momentum. It is easier to keep going than to restart.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Your limits move when your discipline improves.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Effort compounds, even when progress feels invisible.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The results you want are hidden inside the routine you avoid.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Learning is lighter when you stop postponing it.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Keep preparing like your goals are already possible.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'The strongest comeback begins with one honest decision to restart.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'Success is built in hours no one applauds.', author: DEFAULT_QUOTE_AUTHOR },
  { text: 'A focused student can do more in one day than a distracted student does in three.', author: DEFAULT_QUOTE_AUTHOR },
];

export function buildSeedQuotes() {
  return defaultMotivationalQuotes.map((quote, index) => {
    const palette = quotePalette[index % quotePalette.length];
    return {
      ...quote,
      ...palette,
    };
  });
}
