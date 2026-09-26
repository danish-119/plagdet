import { Clock, Code, Hash, Zap, Search, CheckCircle2, Check } from 'lucide-react';
import { PIPELINE_STAGES } from '@/lib/constants';

interface PipelineStepperProps {
  currentPhase: string;
}

const phaseIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="h-[18px] w-[18px]" />,
  lexing: <Code className="h-[18px] w-[18px]" />,
  hashing: <Hash className="h-[18px] w-[18px]" />,
  bucketing: <Zap className="h-[18px] w-[18px]" />,
  analyzing: <Search className="h-[18px] w-[18px]" />,
  completed: <CheckCircle2 className="h-[18px] w-[18px]" />,
};

const phaseHints: Record<string, string> = {
  queued: 'Waiting for a worker',
  lexing: 'Tokenising source files',
  hashing: 'Building MinHash signatures',
  bucketing: 'Grouping similar signatures',
  analyzing: 'Scoring candidate pairs',
  completed: 'All done',
};

export function PipelineStepper({ currentPhase }: PipelineStepperProps) {
  const stages = PIPELINE_STAGES.map((s) => s.id as string);
  const currentIndex = stages.indexOf(currentPhase);

  const getStepState = (phase: string) => {
    const phaseIndex = stages.indexOf(phase);
    if (currentPhase === 'completed' || phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <ol className="relative">
      {PIPELINE_STAGES.map((stage, index) => {
        const state = getStepState(stage.id);
        const last = index === PIPELINE_STAGES.length - 1;

        return (
          <li key={stage.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[19px] top-10 bottom-0 w-px transition-colors duration-500 ${
                  state === 'completed' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                }`}
              />
            )}

            <span
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                state === 'completed'
                  ? 'bg-[var(--color-success)] border-transparent text-white'
                  : state === 'active'
                    ? 'btn-brand border-transparent animate-ring'
                    : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-tertiary)]'
              }`}
            >
              {state === 'completed' ? <Check className="h-[18px] w-[18px]" /> : phaseIcons[stage.id]}
            </span>

            <div className="flex-1 pt-1.5">
              <div className="flex items-center gap-2">
                <h4
                  className={`text-sm font-semibold ${
                    state === 'pending' ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {stage.label}
                </h4>
                {state === 'active' && (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--color-accent-primary)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-primary)]">
                    Running
                  </span>
                )}
                {state === 'completed' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-success)]">
                    Done
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{phaseHints[stage.id]}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
