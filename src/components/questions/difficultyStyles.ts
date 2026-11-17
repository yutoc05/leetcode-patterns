// Shared difficulty styling. Colours resolve to the tokens in src/app/tokens.css.

/** Text colour for an Easy / Medium / Hard label. */
export const difficultyText: Record<string, string> = {
  Easy: "text-easy",
  Medium: "text-medium",
  Hard: "text-hard",
};

/** Background for a question marked done, with a deeper step on hover. */
export const doneRowTint: Record<string, string> = {
  Easy: "bg-easy-wash hover:bg-easy-wash-2",
  Medium: "bg-medium-wash hover:bg-medium-wash-2",
  Hard: "bg-hard-wash hover:bg-hard-wash-2",
};

/** The same tint without the hover step, for content that sits under a done row. */
export const doneRowTintStatic: Record<string, string> = {
  Easy: "bg-easy-wash",
  Medium: "bg-medium-wash",
  Hard: "bg-hard-wash",
};
