import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Step1Account } from './Step1Account';
import { Step2NameAgent } from './Step2NameAgent';
import { Step3ConnectWorkspace } from './Step3ConnectWorkspace';
import { Step4Permissions } from './Step4Permissions';
import { Step5MoreWorkspaces } from './Step5MoreWorkspaces';
import { Step6Voice } from './Step6Voice';
import { Step7FirstSuccess } from './Step7FirstSuccess';

const TOTAL_STEPS = 7;

const stepLabels = [
  'Account',
  'Name Agent',
  'Connect',
  'Permissions',
  'Workspaces',
  'Voice',
  'Done',
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('onboardingProgress');
    if (saved) {
      const data = JSON.parse(saved);
      setCurrentStep(data.currentStep || 1);
      setCompletedSteps(data.completedSteps || []);
    }
  }, []);

  const saveProgress = (step: number, completed: number[]) => {
    localStorage.setItem(
      'onboardingProgress',
      JSON.stringify({ currentStep: step, completedSteps: completed })
    );
  };

  const handleNext = () => {
    const next = currentStep + 1;
    const newCompleted = [...new Set([...completedSteps, currentStep])];
    if (next > TOTAL_STEPS) {
      localStorage.removeItem('onboardingProgress');
      navigate('/dashboard');
      return;
    }
    setCurrentStep(next);
    setCompletedSteps(newCompleted);
    saveProgress(next, newCompleted);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      saveProgress(prev, completedSteps);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Account onNext={handleNext} />;
      case 2: return <Step2NameAgent onNext={handleNext} onBack={handleBack} />;
      case 3: return <Step3ConnectWorkspace onNext={handleNext} onBack={handleBack} />;
      case 4: return <Step4Permissions onNext={handleNext} onBack={handleBack} />;
      case 5: return <Step5MoreWorkspaces onNext={handleNext} onBack={handleBack} />;
      case 6: return <Step6Voice onNext={handleNext} onBack={handleBack} />;
      case 7: return <Step7FirstSuccess onNext={handleNext} />;
      default: return null;
    }
  };

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Progress indicator */}
      <div className="w-full max-w-lg mb-8">
        {/* Step dots */}
        <div className="relative flex items-center justify-between">
          {/* Background track */}
          <div
            className="absolute"
            style={{
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: '2px',
              background: 'var(--color-border)',
              zIndex: 0,
            }}
          />
          {/* Progress fill */}
          <div
            className="absolute transition-all duration-500 ease-out"
            style={{
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: '2px',
              width: `${progressPercent}%`,
              background: 'var(--color-brand)',
              zIndex: 1,
            }}
          />

          {/* Dots */}
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => {
            const isDone = completedSteps.includes(step) && step !== currentStep;
            const isCurrent = step === currentStep;
            const isUpcoming = step > currentStep && !completedSteps.includes(step);

            return (
              <div
                key={step}
                className="relative z-10 flex items-center justify-center"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isCurrent || isDone
                    ? 'var(--color-brand)'
                    : 'var(--color-surface)',
                  border: isUpcoming
                    ? '2px solid var(--color-border)'
                    : '2px solid var(--color-brand)',
                  boxShadow: isCurrent
                    ? '0 0 0 4px rgba(99,102,241,0.2)'
                    : undefined,
                  transition: 'all 300ms ease',
                }}
              >
                {isDone ? (
                  <Check size={13} color="white" strokeWidth={2.5} />
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isCurrent
                        ? 'white'
                        : isUpcoming
                        ? 'var(--color-text-muted)'
                        : 'white',
                    }}
                  >
                    {step}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Step label */}
        <div className="flex justify-center mt-4">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Step {currentStep} of {TOTAL_STEPS} —{' '}
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {stepLabels[currentStep - 1]}
            </span>
          </span>
        </div>
      </div>

      {/* Content card */}
      <div
        className="w-full max-w-lg animate-scale-in"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {renderStep()}
      </div>

      {/* Skip hint */}
      {currentStep < TOTAL_STEPS && (
        <button
          onClick={handleNext}
          className="mt-6 transition-colors duration-150"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
        >
          Skip this step →
        </button>
      )}
    </div>
  );
}
