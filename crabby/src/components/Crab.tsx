/** Crabby the mascot. `mood="sleepy"` closes the eyes (used for resting spots). */
export function Crab({ size = 64, mood = 'happy' }: { size?: number; mood?: 'happy' | 'sleepy' | 'wow' }) {
  return (
    <svg className="crab" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g stroke="#14233B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 40l-8 6M14 46l-6 9M50 40l8 6M50 46l6 9" fill="none" />
        <path d="M20 28l-6-12M44 28l6-12" fill="none" />
        <path className="claw-l" d="M7 14c0-7 11-9 13-2l-6 4z" fill="#FF7559" />
        <path className="claw-r" d="M57 14c0-7-11-9-13-2l6 4z" fill="#FF7559" />
        <ellipse cx="32" cy="40" rx="20" ry="14" fill="#FF7559" />
        <path d="M26 30v-8M38 30v-8" fill="none" />
        <circle cx="26" cy="20" r="4.5" fill="#fff" />
        <circle cx="38" cy="20" r="4.5" fill="#fff" />
      </g>
      {mood === 'sleepy' ? (
        <path d="M23.5 20.5h5M35.5 20.5h5" stroke="#14233B" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="26.5" cy="20.5" r={mood === 'wow' ? 2.6 : 2} fill="#14233B" />
          <circle cx="38.5" cy="20.5" r={mood === 'wow' ? 2.6 : 2} fill="#14233B" />
        </>
      )}
      <circle cx="21" cy="42" r="2.6" fill="#FFB3A3" />
      <circle cx="43" cy="42" r="2.6" fill="#FFB3A3" />
      {mood === 'wow' ? (
        <ellipse cx="32" cy="45" rx="3" ry="3.5" fill="#14233B" />
      ) : (
        <path d="M27 43.5q5 4.5 10 0" stroke="#14233B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
