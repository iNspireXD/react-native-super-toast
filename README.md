# React Native Super Toast

<p align="center">
  <a href="https://supertoast.karkiaswin.com.np/">
    <img src="https://raw.githubusercontent.com/iNspireXD/react-native-super-toast/main/docs/assets/super-toast-banner.png" alt="Super Toast — Toasts that render above everything." width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://supertoast.karkiaswin.com.np/docs">Documentation</a>
  ·
  <a href="https://www.npmjs.com/package/react-native-super-toast">npm</a>
  ·
  <a href="https://github.com/iNspireXD/react-native-super-toast/issues">Issues</a>
</p>

A native toast notification library for React Native, built with a TurboModule
for iOS and Android. Show success, error, loading, and actionable toasts above
native modals and bottom sheets, with automatic keyboard avoidance.

[![npm version](https://img.shields.io/npm/v/react-native-super-toast.svg)](https://www.npmjs.com/package/react-native-super-toast)
[![npm downloads](https://img.shields.io/npm/dm/react-native-super-toast.svg)](https://www.npmjs.com/package/react-native-super-toast)
[![CI](https://github.com/iNspireXD/react-native-super-toast/actions/workflows/ci.yml/badge.svg)](https://github.com/iNspireXD/react-native-super-toast/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/iNspireXD/react-native-super-toast/blob/main/LICENSE)

For installation guides, API details, examples, and demos, visit the
[Super Toast documentation](https://supertoast.karkiaswin.com.np/docs).

[Quickstart](#installation) · [Toasts above modals](#show-a-toast-above-a-react-native-modal) · [Keyboard behavior](#keyboard) · [Compatibility](#compatibility) · [Troubleshooting](#troubleshooting)

## Native modal demos

See React Native Super Toast display toast notifications above native modals on
iOS and Android.

| iOS                                                                                                                                                                                                                              | Android                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="https://raw.githubusercontent.com/iNspireXD/react-native-super-toast/main/docs/assets/native-modal-ios.gif" alt="React Native Super Toast demo showing toast notifications above a native modal on iOS" width="280" /> | <img src="https://raw.githubusercontent.com/iNspireXD/react-native-super-toast/main/docs/assets/native-modal-android.gif" alt="React Native Super Toast demo showing toast notifications above a native modal on Android" width="280" /> |

## Features

- A small imperative `toast()` API with a single `<ToastHost />`
- A code-generated native module (TurboModule) connecting the JavaScript API to
  native iOS and Android implementations
- `success`, `error`, `warning`, `info`, `loading`, and `promise` variants
- Title, description, action, and cancel buttons
- Light, dark, and system themes, with optional rich colors
- Top, bottom, or center positions, listed or stacked
- Keyboard aware out of the box: bottom and center toasts move above the
  keyboard, with no setup or extra dependency
- Swipe up or left to dismiss, plus an optional close button
- Updating a toast in place, `toast.wiggle`, haptics, and image, text, or font
  icons
- Rendered natively on both platforms (dialog windows on Android, an overlay
  `UIWindow` on iOS), with no Reanimated, Gesture Handler, Screens, or SVG
  dependency

## Installation

```sh
npm install react-native-super-toast
npx pod-install
```

Run the pod installation step for iOS, then rebuild your native app on each
platform. Installing JavaScript dependencies or refreshing Metro alone does
not add the native module to an existing app binary.

## Setup

Mount `ToastHost` once near the root of the app.

```tsx
import { Button, View } from 'react-native';
import { toast, ToastHost } from 'react-native-super-toast';

export default function App() {
  return (
    <>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Button title="Show toast" onPress={() => toast.success('Saved')} />
      </View>
      <ToastHost />
    </>
  );
}
```

## Usage

```tsx
import { toast } from 'react-native-super-toast';

toast('Event has been created');

toast.success('Saved', { description: 'Your changes are live.' });
toast.error('Could not reach the server');
toast.warning('Storage almost full');
toast.info('New version available');
```

### Show a toast above a React Native Modal

Super Toast renders in native windows: dialog windows on Android and an overlay
`UIWindow` on iOS. Toasts can appear above a native modal without moving the
`ToastHost` into that modal or adjusting a React view's `zIndex`.

With `ToastHost` mounted at the app root, use this screen to try it:

```tsx
import { useState } from 'react';
import { Button, Modal, View } from 'react-native';
import { toast } from 'react-native-super-toast';

export function ModalExample() {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <Button title="Open modal" onPress={() => setVisible(true)} />
      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Button
            title="Show toast above modal"
            onPress={() => toast.success('Saved from the modal')}
          />
          <Button title="Close modal" onPress={() => setVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}
```

### Toasts with bottom sheets

Call `toast()` from a bottom-sheet callback just as you would from any other
screen. Keep a single `ToastHost` near the app root. The
[example app](https://github.com/iNspireXD/react-native-super-toast/tree/main/example)
includes an integration with `@gorhom/bottom-sheet`.

For text inputs inside a sheet, see [keyboard behavior](#keyboard). Bottom and
center toasts avoid the software keyboard automatically.

### Actions

Pressing the action calls `onClick` and dismisses the toast. Pressing cancel
calls `onClick`, then `onDismiss`, and dismisses the toast.

```tsx
toast('Message archived', {
  action: { label: 'Undo', onClick: () => restore() },
  cancel: { label: 'Close', onClick: () => {} },
});
```

### Promises

```tsx
toast.promise(uploadFile(), {
  loading: 'Uploading…',
  success: (file) => `${file.name} uploaded`,
  error: (error) => `Upload failed: ${String(error)}`,
});
```

### Updating, dismissing, and wiggling

Showing a toast with an existing `id` updates that toast in place.

```tsx
const id = toast.loading('Uploading…');
// later
toast.success('Uploaded', { id });

toast.wiggle(id); // draw attention
toast.dismiss(id); // dismiss one
toast.dismiss(); // dismiss all
```

`toast.loading` toasts stay visible until they are updated or dismissed. Pass
`duration: Infinity` to keep any other toast visible.

## Toast options

| Option                                                                                     | Type                                          | Description                                              |
| ------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------- |
| `id`                                                                                       | `string \| number`                            | Reuse an id to update a toast.                           |
| `description`                                                                              | `string`                                      | Secondary text.                                          |
| `icon`                                                                                     | `ToastIcon`                                   | Replaces the variant icon.                               |
| `duration`                                                                                 | `number`                                      | Milliseconds, or `Infinity`.                             |
| `position`                                                                                 | `'top-center' \| 'bottom-center' \| 'center'` | Overrides the ToastHost.                                 |
| `dismissible`                                                                              | `boolean`                                     | Allows swipe and close-button dismissal. Default `true`. |
| `closeButton`                                                                              | `boolean`                                     | Shows a close button.                                    |
| `richColors`                                                                               | `boolean`                                     | Tinted background for variants.                          |
| `invert`                                                                                   | `boolean`                                     | Uses the opposite theme.                                 |
| `haptic`                                                                                   | `boolean`                                     | Plays a light haptic when the toast appears.             |
| `action`, `cancel`                                                                         | `{ label, onClick }`                          | Buttons below the text.                                  |
| `onDismiss`, `onAutoClose`                                                                 | `(id) => void`                                | Called when the toast is dismissed or times out.         |
| `onPress`                                                                                  | `() => void`                                  | Called when the toast is pressed.                        |
| `style`, `styles`                                                                          | `ToastViewStyle`, `ToastStyles`               | See [Styling](#styling).                                 |
| `actionButtonStyle`, `actionButtonTextStyle`, `cancelButtonStyle`, `cancelButtonTextStyle` | styles                                        | Button styles.                                           |

## ToastHost props

| Prop                      | Default        | Description                                                                             |
| ------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `position`                | `'top-center'` | Where toasts appear.                                                                    |
| `theme`                   | `'system'`     | `'light'`, `'dark'`, or `'system'`.                                                     |
| `richColors`              | `false`        | Tinted backgrounds for variants.                                                        |
| `invert`                  | `false`        | Uses the opposite theme.                                                                |
| `closeButton`             | `false`        | Shows a close button on every toast.                                                    |
| `duration`                | `4000`         | Default duration in milliseconds.                                                       |
| `visibleToasts`           | `3`            | Maximum toasts per position. Older toasts are dismissed.                                |
| `gap`                     | `14`           | Space between listed toasts.                                                            |
| `offset`                  | `8`            | Distance from the safe area edge: a number or `{ top, bottom }`. See [Offset](#offset). |
| `swipeToDismissDirection` | `'up'`         | Dismiss direction: `'up'`, `'down'`, `'left'`, or `'right'`.                            |
| `enableStacking`          | `false`        | Collapses toasts into an overlapping deck.                                              |
| `expandOnPress`           | `false`        | Expands a collapsed stack when its front toast is pressed.                              |
| `haptic`                  | `false`        | Default haptic setting.                                                                 |
| `icons`                   | —              | Replaces the icon for `success`, `error`, `warning`, `info`, or `loading`.              |
| `toastOptions`            | —              | Default styles, including per-variant container styles.                                 |

### Offset

`offset` is measured from the safe area edge a toast is anchored to: down from
the top for `top-center` toasts and up from the bottom for `bottom-center`
toasts. `center` toasts ignore it. While the keyboard is open, `bottom-center`
toasts measure `offset` from the top of the keyboard instead.

Pass a number to use the same distance for both edges, or an object to set each
edge. An omitted edge keeps the default: `8`, or `16` when the device has no
safe area inset on that edge.

```tsx
<ToastHost offset={16} />;

// Keep bottom toasts clear of a tab bar.
<ToastHost offset={{ top: 8, bottom: 80 }} />;
```

### Keyboard

Toasts avoid the software keyboard on both platforms without any setup:

- `bottom-center` toasts sit above the keyboard.
- `center` toasts re-center in the space above the keyboard.
- `top-center` toasts do not move.

Toasts follow the keyboard as it opens, closes, or changes height, and a toast
shown while the keyboard is already open appears above it. This also works when
the input is inside a bottom sheet.

Floating and undocked iPad keyboards do not cover the bottom edge, so toasts
stay in place for them.

## Styling

Toasts are drawn with native views, so styles use a fixed set of keys that
render the same on both platforms:

- `ToastViewStyle`: `backgroundColor`, `borderColor`, `borderWidth`,
  `borderRadius`, `padding`, `paddingHorizontal`, `paddingVertical`
- `ToastTextStyle`: `color`, `fontSize`, `fontFamily`, `fontWeight`,
  `lineHeight`

```tsx
<ToastHost
  toastOptions={{
    style: { borderRadius: 12 },
    titleStyle: { fontFamily: 'Inter' },
    success: { backgroundColor: '#ecfdf3' },
  }}
/>;

toast('Custom', {
  style: { backgroundColor: '#111111' },
  styles: {
    title: { color: '#ffffff' },
    description: { color: '#c8c8c3' },
    icon: { color: '#7ee2a8' },
    closeButtonIcon: { color: '#ffffff' },
  },
});
```

Font families follow React Native's custom font setup. On Android, font files
linked into `assets/fonts` should use the family name as their file name.

## Icons

```tsx
import { fontIcon, toast } from 'react-native-super-toast';

toast('Text icon', { icon: '🎉' });
toast('Image icon', {
  icon: { type: 'image', source: require('./bell.png'), tintColor: '#111' },
});
toast('Font icon', {
  icon: fontIcon({ glyph: 0xe7f4, fontFamily: 'Material Icons' }),
});
```

## Behavior notes

- Toast content is data, not JSX: there is no `toast.custom`, and icons and
  buttons do not accept React elements. This lets both platforms render toasts
  in native windows above modals and bottom sheets.
- Styles are limited to the keys listed in [Styling](#styling).
- Plain `toast()` shows no icon.

## Compatibility

| Environment             | Current scope                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| iOS and Android         | Native implementations are included for both platforms.                                                                  |
| React Native            | The example app uses React Native 0.85.0 and React 19.2.3. A wider version range has not been established here.          |
| Architecture            | Uses a code-generated TurboModule. Validate other React Native versions and architecture configurations before adopting. |
| Expo Go                 | Cannot load this package's custom native module.                                                                         |
| Expo development builds | A native build containing the module is required; this repository does not include an Expo validation app.               |
| Web                     | No web implementation is included.                                                                                       |

The example app's configured versions are a reference, not a claim that every
older or newer version is supported.

## Troubleshooting

### The SuperToast native module cannot be found

Rebuild the native app after installing the package. On iOS, install pods first.
Fast Refresh and restarting Metro do not rebuild native code. Confirm that you
are running the rebuilt application rather than an older installed binary or
Expo Go.

### Toast settings are not applied

Mount a single `ToastHost` near the app root to provide shared configuration.
Check whether the individual toast call overrides settings such as `position`
or `duration`. You do not need a separate host for each modal or bottom sheet.

### A loading toast stays visible

`toast.loading()` stays visible until updated or dismissed. Reuse its `id` with
`toast.success()` or `toast.error()`, call `toast.dismiss(id)`, or use
`toast.promise()` to follow an asynchronous operation.

### Custom React elements or styles do not render

Toast content is rendered with native views, not arbitrary JSX. Use the
supported [styling options](#styling), [icons](#icons), and action buttons.

For a reproducible native demo, see the
[example app](https://github.com/iNspireXD/react-native-super-toast/tree/main/example).
When [reporting an issue](https://github.com/iNspireXD/react-native-super-toast/issues),
include the package version, React Native version, platform, architecture, and
a minimal reproduction.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made by [Aswin Karki](https://github.com/iNspireXD)
