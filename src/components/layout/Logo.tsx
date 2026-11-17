export default function Logo() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  // The wordmark PNGs are opaque (white and near-black grounds); the blend
  // modes drop that ground so the mark sits straight on the slate paper.
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/images/logo-light.png`}
        alt="Leetcode Patterns"
        width={1358}
        height={178}
        className="h-8 w-auto mix-blend-multiply dark:hidden sm:h-10"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${basePath}/images/logo-dark.png`}
        alt="Leetcode Patterns"
        width={1358}
        height={178}
        className="hidden h-8 w-auto mix-blend-lighten dark:block sm:h-10"
      />
    </>
  );
}
