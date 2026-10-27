interface MultiStepProgressProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function MultiStepProgress({ currentStep, totalSteps, label }: MultiStepProgressProps) {
  const percent = (currentStep / totalSteps) * 100;
  return (
    <div className="px-margin-mobile pt-6 pb-2">
      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 font-caption text-caption text-on-surface-variant text-right">
        {label ?? `Step ${currentStep} of ${totalSteps}`}
      </div>
    </div>
  );
}
