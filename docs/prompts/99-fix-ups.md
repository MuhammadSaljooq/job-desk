# Fix-up prompts

## After every phase, check
- [ ] The page looks like its screenshot in docs/screens/
- [ ] It works at phone width (375px)
- [ ] Empty, loading and error states show correctly
- [ ] Money shows two decimals and totals add up
- [ ] pnpm lint, pnpm typecheck and pnpm test pass
- [ ] docs/PROGRESS.md is updated, and the commit is made

## When the design drifts
The [page] doesn't match docs/screens/[file].png. Screenshot the current page
with the Playwright MCP at 1440px, compare it side by side with the reference,
list every difference (spacing, radius, colors, font sizes, order of cards),
then fix them using only the tokens in globals.css.

## When something breaks
[Describe what you did and what happened, paste the error.] Find the root
cause before changing code. Explain it in two sentences, propose the fix,
add a test that fails before the fix and passes after, then apply it.

## When the client asks for a change
The client wants: [change]. Check docs/page-spec.md and the current code,
tell me which files and database fields this touches and anything it could
break, then wait for my OK before implementing it.

## Before a demo
Reset the database and run the seed. Click through the whole flow with the
Playwright MCP: new customer, job, photos, quote from the catalog, accept,
record payment, check the dashboard and books. Report anything that looks
wrong or confusing to a non-technical user.
