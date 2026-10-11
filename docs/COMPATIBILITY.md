# Compatibility

## Canonical product name

**VUC** is the canonical current product name used in new documentation and new capabilities.

## Legacy names

**VUA** and **Vortex** remain in historical source names, documentation, CLI banners, and compatibility entry points. The exact meaning of “Vortex” depends on context; it may refer to the broader architecture rather than a CLI alias.

## CLI and package mapping

The inspected `package.json` declares:

```json
{
  "bin": {
    "vuc": "./dist/vua.cjs",
    "vua": "./dist/vua.cjs",
    "vortex": "./dist/vua.cjs"
  }
}
```

Thus, these executable names map to the same packaged entry file in the declared package contract. The internal filename `dist/vua.cjs` is historical; it does not make VUA the canonical product name.

The source tree also contains `bin/vuc.js` and `bin/vua.js`. Their behavior and banners may differ in a given revision, so verify the installed package rather than assuming every entry point is identical.

## Package identity

The current repository package metadata declares `@vucfoundation/vuc`. Older documentation may mention `@vortexfoundation/vuc`, `@vortexfoundation/vua`, or other historical package names. Do not copy those names into new install instructions without verifying the current `package.json` and registry publication.

## Rules for new contributions

1. Use **VUC** for new product-facing documentation, commands, examples, and capabilities.
2. Preserve legacy names when required for compatibility or historical accuracy.
3. Explain a legacy name once and link back to this document instead of repeating long disclaimers.
4. Do not rename or move existing files solely for cosmetic reasons when doing so would break links.
5. Treat compatibility aliases as entry-point compatibility, not proof of behavioral equivalence across versions.

See [CLI](./CLI.md), [Architecture](./ARCHITECTURE.md), and [CI status](./CI-STATUS.md).
