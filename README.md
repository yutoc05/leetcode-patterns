# Yeetcode Patterns

A curated list of LeetCode questions grouped by the pattern that solves them, so you practise recognising patterns instead of tackling problems at random.

**Live site:** https://yutoc05.github.io/yeetcode-patterns/

[![Deploy to GitHub Pages](https://github.com/yutoc05/yeetcode-patterns/actions/workflows/deploy.yml/badge.svg)](https://github.com/yutoc05/yeetcode-patterns/actions/workflows/deploy.yml)

## What's in it

- **All Questions**: every question with filters for difficulty, pattern and company, plus stars, notes and review dates.
- **Beginner and Experienced roadmaps**: ordered paths through the list, phase by phase.
- **Revision**: solved questions come back when they're due, scheduled with [FSRS] (the spaced-repetition algorithm Anki uses). Rate each one Hard, Good or Easy and the next review date is set for you.
- **Helpful Tips**: which approach to reach for, based on the problem's constraints.
- Progress is saved in your browser. Sign in with GitHub to sync it across devices.

Questions link to [leetcode.com]; some require [LeetCode Premium].

## Development

The app is built with [Next.js] (App Router), [React] 19, [TypeScript], [Tailwind CSS] v4, [TanStack Table] v8, and [Lucide React] for icons. Tests use [Vitest] + [React Testing Library].

```bash
npm install
npm run dev         # http://localhost:3000
npm test            # single run
npm run test:watch  # watch mode
```

### Supabase setup

The app uses Supabase for authentication and syncing user progress. Create a
Supabase project, then copy its URL and browser-safe publishable key from
**Project Settings > API** into `.env.local`:

```bash
cp .env.local.example .env.local
```

Set these values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

The publishable key (or legacy `anon` key) is intended for browser use. Never
put a Supabase `service_role` or secret key in a `NEXT_PUBLIC_*` variable or
commit it to the repository. Restart the dev server after changing env vars.

For GitHub sign-in on the deployed site, add `https://yutoc05.github.io/yeetcode-patterns/`
under **Authentication > URL Configuration** in Supabase.

A [Husky] `pre-push` hook runs `npm test` automatically before every push. This is set up for every clone via the `prepare` script.

## Credits and license

Yeetcode Patterns is adapted from [Leetcode Patterns] by Sean Prashad and has
been modified since (a redesign, inline notes, revision tools and more). The
question list builds on the [Blind 75 list], [Grokking the Coding Interview]
and [14 patterns to ace any coding interview question].

Licensed under [CC BY-NC 4.0](LICENSE), the original work's license: free to
use and adapt with attribution, not for commercial use.

[leetcode.com]: https://leetcode.com
[leetcode premium]: https://leetcode.com/subscribe/
[next.js]: https://nextjs.org
[react]: https://react.dev
[typescript]: https://www.typescriptlang.org
[tailwind css]: https://tailwindcss.com
[tanstack table]: https://tanstack.com/table
[lucide react]: https://lucide.dev
[vitest]: https://vitest.dev
[react testing library]: https://testing-library.com/docs/react-testing-library/intro
[husky]: https://typicode.github.io/husky
[fsrs]: https://github.com/open-spaced-repetition/ts-fsrs
[leetcode patterns]: https://github.com/SeanPrashad/leetcode-patterns
[blind 75 list]: https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-100-LeetCode-Questions-to-Save-Your-Time-OaM1orEU
[grokking the coding interview]: https://www.designgurus.io/course/grokking-the-coding-interview
[14 patterns to ace any coding interview question]: https://hackernoon.com/14-patterns-to-ace-any-coding-interview-question-c5bb3357f6ed
