// The wordmark: "yeetcode" in the deep brand blue and "patterns" in the
// accent blue, set together in Plus Jakarta Sans ExtraBold.
export default function Logo() {
  return (
    <>
      <span className="sr-only">Yeetcode Patterns</span>
      <span
        aria-hidden="true"
        className="inline-block font-wordmark text-3xl leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap sm:text-4xl"
      >
        <span className="text-brand-ink">yeetcode</span>
        <span className="text-brand">patterns</span>
      </span>
    </>
  );
}
