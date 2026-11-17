// Text wordmark. A placeholder until one of the wordmark directions is chosen;
// swapping it means changing only this component.
export default function Logo() {
  return (
    <span className="inline-block font-display text-3xl leading-none font-semibold tracking-[-0.035em] whitespace-nowrap sm:text-4xl">
      <span className="text-brand-ink">Yeetcode</span>{" "}
      <span className="text-brand">Patterns</span>
    </span>
  );
}
