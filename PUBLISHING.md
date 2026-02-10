# Publishing

In order for other people to install and use this component, you can publish the
package to npm.

You will first need to have an npmjs account with permissions to push to your
package name.

If this is your first time, here are the recommended steps:

1. Ensure the package.json "name" matches what you want it to be called. It
   should either be like `my-package` or `@my-org/my-package`. If it's the
   latter, ensure you have an npmjs account with permissions to push to
   `my-org`.
2. `bun run clean` to clean your `/dist` directory.
3. `bun install` to install the dependencies with the versions specified in
   `bun.lock`.
4. `bun run build` to build the package fresh.
5. (Optional) `bun run typecheck` to typecheck the package.
6. (Optional) `bun run lint` to lint the package.
7. (Optional) `bun run test` to test the package.
8. `npm publish --access public` to publish the package to npm (Bun does not yet
   have a native publish command, but you can use `npm publish` or
   `bun x npm publish`).
9. `git tag v0.1.0` to tag the new version.
10. `git push --follow-tags` to push the tags to the repository. This way, other
    contributors can always see what code was published with each version.
    Running `npm version ...` will create these tags and commits automatically.

After the initial publish, you can use the release scripts documented below.

## Package scripts for releasing

In package.json, there are some scripts that are useful for doing releases.

- `preversion` will run the tests and typecheck the code before marking a new
  version.
- `version` will open the changelog in vim and then save it before committing
  the new version.
- `prepublishOnly` will make a clean build of the package before publishing.

These are not required and can be modified or removed if desired. They will all
be run automatically when using one of the deployment commands.

## Deploying a new alpha version

```sh
bun run alpha
```

This will create a prerelease version with an `@alpha` tag. It will then publish
the package to npm and push the code and new tag. Users can install the package
with `bun add @your-package@alpha`.

## Deploying a new release version

```sh
bun run release
```

This will create a patch version and publish as `latest`. It will then publish
the package to npm and push the code and new tag. To publish a new minor or
major version, you can run the commands manually:

```sh
npm version minor # or major
npm publish
git push --follow-tags
```

## Building a one-off package

```sh
bun run clean
bun run build
npm pack
```

You can then provide the .tgz file to others to install via
`bun add ./path/to/your-package.tgz`.
