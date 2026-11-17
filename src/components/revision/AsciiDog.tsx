// A small ASCII dog that wags its tail: two frames that swap via CSS
// (dog-wag in globals.css). Under reduced motion it sits still on the first.
const TAIL_DOWN = [
  "  \\           __",
  "   \\         / o\\___",
  "    \\_______/    ___o",
  "    |  ______   /",
  "    |_|      |_|",
].join("\n");

const TAIL_UP = [
  "      /       __",
  "     /       / o\\___",
  "    |_______/    ___o",
  "    |  ______   /",
  "    |_|      |_|",
].join("\n");

export default function AsciiDog() {
  return (
    <div className="relative font-outlier text-xl leading-tight text-brand" aria-hidden="true">
      <pre className="dog-frame dog-frame-a m-0">{TAIL_DOWN}</pre>
      <pre className="dog-frame dog-frame-b absolute inset-0 m-0">{TAIL_UP}</pre>
    </div>
  );
}
