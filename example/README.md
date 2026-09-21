# React Native Super Toast example app

A native iOS and Android demo of [React Native Super Toast](https://github.com/iNspireXD/react-native-super-toast), including toast notifications above modals and bottom sheets.

## What to try

- Show success, error, warning, info, and loading toasts.
- Open a React Native modal and trigger a toast above it.
- Try the `@gorhom/bottom-sheet` integrations, including sheet modals.
- Focus a text input and check how bottom and center toasts avoid the keyboard.
- Explore themes, positions, actions, icons, and stacking.

The demo source is in [src/App.tsx](src/App.tsx). The app uses the library in this workspace, so native library changes require a native rebuild.

## Run locally

Set up the React Native native development tools for your platform. Use the Node version in [../.nvmrc](../.nvmrc) and the Yarn version declared in the root package manifest.

From the repository root, install dependencies and start Metro:

```sh
yarn
yarn example start
```

In a separate terminal, from the repository root, run Android:

```sh
yarn example android
```

For iOS, install CocoaPods dependencies first:

```sh
cd example
bundle install
bundle exec pod install --project-directory=ios
cd ..
yarn example ios
```

This example is configured with React Native 0.85.0 and React 19.2.3. It is a native React Native app, not an Expo Go example.

## Documentation

- [Installation and API reference](../README.md)
- [Super Toast documentation website](https://rn-super-toast.vercel.app/docs)
- [Contribution and development workflow](../CONTRIBUTING.md)
