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

Update a persistent toast in place to represent an async task:

```tsx
const id = SuperToast.loading({
  title: 'Uploading',
  message: 'Please wait…',
  duration: 0,
});

try {
  await uploadFile();
  SuperToast.update(id, {
    kind: 'success',
    title: 'Upload complete',
    message: 'Your file is ready.',
    duration: 2500,
  });
} catch {
  SuperToast.update(id, {
    kind: 'error',
    title: 'Upload failed',
    duration: 3000,
  });
}
```

When no custom icon is supplied, `loading` uses an animated spinner and the
success, error, warning, and info states use built-in state icons.

The host supports top, center, and bottom positioning, content or screen width,
queueing, slide/fade/scale animations, image and font icons, press or swipe
dismissal, haptics, and persistent toasts.

### Stacked toasts

Enable `stack` for overlapping top-positioned toasts. New toasts appear in
front, while older toasts remain visible underneath and keep their own
durations.

```tsx
SuperToast.configure({
  position: 'top',
  stack: true,
  stackLimit: 3,
  stackOffset: 10,
});

SuperToast.show({ title: 'Saved', message: 'Your changes were saved.' });
SuperToast.show({ title: 'New message', message: 'Sarah sent a photo.' });
```

`stackLimit` controls the visible layer count and `stackOffset` controls how
many points each older card peeks out below the newest card.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
