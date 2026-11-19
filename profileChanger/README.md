# ProfileChanger

Local userplugin. Lives in `src/userplugins`, which is gitignored, so nothing here is committed or submitted upstream.

## Files

- `index.ts` – plugin entry point, runs in the renderer (browser APIs only)
- `native.ts` – add this only if you need Node.js APIs (`fs`, `child_process`, ...)
- `index.tsx` – rename `index.ts` to this if you need JSX

## Dev workflow

```sh
pnpm install     # once
pnpm watch       # rebuild on change
pnpm test:ts     # typecheck only
pnpm lint        # oxlint only
```

Load it into the client:

```sh
pnpm inject      # dev install into the Discord desktop app
pnpm uninject    # undo that
```

Then enable **ProfileChanger** in Settings → Vencord → Plugins.

## Notes

- `name` is what Vencord uses for `$self` in patches and for the settings key, not the folder name.
- `authors` uses `{ name, id }` for userplugins. Use your real Discord ID instead of `0n`.
- Failed patches only log `Patch by ProfileChanger had no effect`; check the console after building.
