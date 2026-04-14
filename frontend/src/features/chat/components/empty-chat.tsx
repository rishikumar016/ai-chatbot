import { PenLine, Sparkles, Wand2 } from 'lucide-react'

const suggestions = [
  {
    icon: PenLine,
    title: 'Refine the aesthetic',
    description: 'Polish and elevate your creative work',
  },
  {
    icon: Sparkles,
    title: 'Explore ideas',
    description: 'Discover new creative directions',
  },
  {
    icon: Wand2,
    title: 'Generate visuals',
    description: 'Create stunning visual concepts',
  },
]

export function EmptyChat() {
  return (
    <div className='relative flex flex-1 flex-col items-center justify-center px-4'>
      {/* Ambient gold glow */}
      <div
        className='pointer-events-none absolute inset-0 flex items-center justify-center'
        aria-hidden='true'
      >
        <div className='h-80 w-120 rounded-full bg-craft-gold-glow blur-3xl' />
      </div>

      <div className='relative z-10 flex flex-col items-center'>
        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-craft-gold-glow'>
          <Sparkles className='h-6 w-6 text-craft-gold' />
        </div>
        <h1 className='mt-6 font-manrope text-3xl font-semibold tracking-tight text-foreground'>
          What shall we craft today?
        </h1>
        <p className='mt-2 text-center text-sm text-muted-foreground'>
          Start a new session or choose a suggestion below
        </p>
        <div className='mt-10 grid w-full max-w-xl gap-4 sm:grid-cols-3'>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.title}
              className='group flex flex-col items-center gap-2.5 rounded-xl bg-craft-surface-low p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-accent'
            >
              <suggestion.icon className='h-5 w-5 text-craft-gold' />
              <span className='text-sm font-medium text-foreground'>
                {suggestion.title}
              </span>
              <span className='text-xs leading-relaxed text-muted-foreground'>
                {suggestion.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
