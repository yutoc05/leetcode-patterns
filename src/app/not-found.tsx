import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-(--gutter)">
      <div className="w-full max-w-md border-t-2 border-ink bg-sheet px-6 pt-6 pb-10">
        <p className="font-display text-figure leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums">
          404
        </p>
        <h1 className="mt-6 text-2xl">Page not found</h1>
        <p className="mt-2 text-ink-2">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" className="btn mt-6">
          Back to questions
        </Link>
      </div>
    </div>
  );
}
