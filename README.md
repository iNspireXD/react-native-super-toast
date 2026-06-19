# react-native-super-toast

A performant toast library that renders above everything, including modals and
bottom sheets.

## Installation

```sh
npm install react-native-super-toast react-native-screens
```

On iOS, install the native pods after adding the packages:

```sh
npx pod-install
```

## Setup

Mount `SuperToastHost` once near the root of the app. On iOS it uses
`FullWindowOverlay` from `react-native-screens`; on Android it renders nothing
because Android uses the native dialog host.

```tsx
import { SuperToastHost } from 'react-native-super-toast';

export default function App() {
  return (
    <>
      <YourApp />
      <SuperToastHost />
    </>
  );
}
```

## Usage

```tsx
import SuperToast from 'react-native-super-toast';

SuperToast.success({
  title: 'Saved',
  message: 'Your changes are ready.',
  icon: '✓',
});

const loadingId = SuperToast.loading({
  title: 'Uploading',
  duration: 0,
});

SuperToast.dismiss(loadingId);
```

The host supports top, center, and bottom positioning, content or screen width,
queueing, slide/fade/scale animations, image and font icons, press or swipe
dismissal, haptics, and persistent toasts.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
