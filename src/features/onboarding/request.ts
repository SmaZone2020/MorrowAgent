import { create } from "zustand";

interface OnboardingRequest {
  /** Bumped every time something asks for the wizard. */
  pending: number;
  /** Reopens the first-run flow from wherever it is asked for. */
  request: () => void;
  consume: () => void;
}

/**
 * A one-shot request to reopen the first-run flow.
 *
 * The wizard belongs to the shelf, because that is the only page where it makes
 * sense — it installs a package and sets a goal on it. A dev-only trigger in the
 * title bar still has to reach it from any page, so the request is a counter the
 * shelf watches rather than a prop threaded through the router.
 */
export const useOnboardingRequest = create<OnboardingRequest>((set) => ({
  pending: 0,
  request: () => set((state) => ({ pending: state.pending + 1 })),
  consume: () => set({ pending: 0 }),
}));
