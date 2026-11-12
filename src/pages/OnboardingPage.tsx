import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { settingsPath } from "@/app/navigation";
import { usePersistedState } from "@/features/uiState";
import { appScope } from "@/features/uiState/scope";
import { useLibrary } from "@/features/library/store";
import { useProviderStatus } from "@/features/settings/providerStatus";
import { useOnboardingRequest } from "@/features/onboarding/request";
import {
  OnboardingDialog,
  type OnboardingStep,
} from "@/features/onboarding/OnboardingDialog";
import { HelloDraw } from "@/features/onboarding/HelloDraw";

/** How long the finished greeting stays on screen before the shelf fades in. */
const HOLD_MS = 2000;
/** The fade from the greeting into the shelf. */
const FADE_MS = 450;

/**
 * The first run, on its own page.
 *
 * Setup used to be a modal over an empty shelf, which put the wizard in front of
 * the thing it was hiding and let the empty state flash behind it. As a page it
 * is one plain surface with nothing else on it: the modal is the only object,
 * and there is no shelf to mistake for the place to start.
 *
 * When the last step is answered the page does not navigate straight away. The
 * greeting is drawn stroke by stroke, holds for a moment, then fades out into
 * the shelf — a first run should end on something made rather than on a form
 * disappearing. The shelf itself is untouched by any of this: installing a
 * package here does nothing else, and the learner decides when to start.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const hydrate = useLibrary((state) => state.hydrate);
  const hydrateProviders = useProviderStatus((state) => state.hydrate);
  const configured = useProviderStatus((state) => state.configured);
  const replayRequest = useOnboardingRequest((state) => state.pending);
  const consumeReplay = useOnboardingRequest((state) => state.consume);
  const [, setDone] = usePersistedState(appScope("onboarding.done"), false);
  const [step, setStep] = usePersistedState<OnboardingStep>(
    appScope("onboarding.step"),
    "welcome",
  );
  const [open, setOpen] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [fading, setFading] = useState(false);
  const reduce = useReducedMotion() ?? false;

  // Both stores are read here rather than in the shell: the page can be opened
  // directly (a dev replay, a deep link), and the provider step needs the
  // credential book before it can tell whether anything is missing.
  useEffect(() => {
    void hydrate();
    void hydrateProviders();
  }, [hydrate, hydrateProviders]);

  // A replay from the title bar lands here with the counter bumped; start over.
  useEffect(() => {
    if (replayRequest === 0) return;
    consumeReplay();
    setStep("welcome");
    setOpen(true);
    setCelebrating(false);
    setDrawn(false);
    setFading(false);
  }, [consumeReplay, replayRequest, setStep]);

  const leave = useCallback(() => {
    setDone(true);
    setStep("welcome");
    navigate("/", { replace: true });
  }, [navigate, setDone, setStep]);

  const finish = () => {
    setOpen(false);
    setDone(true);
    setStep("welcome");
    setCelebrating(true);
  };

  // The hold starts when the last stroke lands. Reduced motion has no strokes to
  // wait for, so it goes straight to the shelf instead of holding a still frame.
  useEffect(() => {
    if (!celebrating) return;
    if (reduce) {
      leave();
      return;
    }
    if (!drawn) return;
    const timer = window.setTimeout(() => setFading(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [celebrating, drawn, leave, reduce]);

  // The fade ends the page rather than the other way round, so the shelf never
  // appears underneath a half-transparent greeting.
  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(leave, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [fading, leave]);

  return (
    <motion.div
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: FADE_MS / 1000, ease: "easeInOut" }}
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-background"
    >
      <AnimatePresence mode="wait">
        {celebrating ? (
          <motion.div
            key="greeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center gap-6"
          >
            <HelloDraw
              className="text-foreground"
              onComplete={() => setDrawn(true)}
            />
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.4, duration: 0.5 }}
              className="text-sm text-muted-foreground"
            >
              准备好了，去挑一本书。
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <OnboardingDialog
        open={open && !celebrating}
        step={step}
        onStep={setStep}
        providerConfigured={configured}
        onOpenSettings={() => {
          setOpen(false);
          navigate(settingsPath);
        }}
        onFinish={finish}
      />
    </motion.div>
  );
}
