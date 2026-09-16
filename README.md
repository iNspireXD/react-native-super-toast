# react-native-super-toast

Native toasts for React Native that render above everything, including native
modals and bottom sheets.

- A small imperative `toast()` API with a single `<ToastHost />`
- `success`, `error`, `warning`, `info`, `loading`, and `promise` variants
- Title, description, action, and cancel buttons
- Light, dark, and system themes, with optional rich colors
- Top, bottom, or center positions, listed or stacked
- Swipe up or left to dismiss, plus an optional close button
- Updating a toast in place, `toast.wiggle`, haptics, and image, text, or font
  icons
- Rendered natively on Android (dialog windows) and through
  `FullWindowOverlay` on iOS, with no Reanimated, Gesture Handler, or SVG
  dependency

## Installation

```sh
npm install react-native-super-toast react-native-screens
npx pod-install
```

## Setup

Mount `ToastHost` once near the root of the app.

```tsx
import { ToastHost } from 'react-native-super-toast';

export default function App() {
  return (
    <>
      <YourApp />
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

| Prop                      | Default        | Description                                                                |
| ------------------------- | -------------- | -------------------------------------------------------------------------- |
| `position`                | `'top-center'` | Where toasts appear.                                                       |
| `theme`                   | `'system'`     | `'light'`, `'dark'`, or `'system'`.                                        |
| `richColors`              | `false`        | Tinted backgrounds for variants.                                           |
| `invert`                  | `false`        | Uses the opposite theme.                                                   |
| `closeButton`             | `false`        | Shows a close button on every toast.                                       |
| `duration`                | `4000`         | Default duration in milliseconds.                                          |
| `visibleToasts`           | `3`            | Maximum toasts per position. Older toasts are dismissed.                   |
| `gap`                     | `14`           | Space between listed toasts.                                               |
| `offset`                  | `8`            | Distance from the safe area edge.                                          |
| `swipeToDismissDirection` | `'up'`         | Dismiss direction: `'up'`, `'down'`, `'left'`, or `'right'`.               |
| `enableStacking`          | `false`        | Collapses toasts into an overlapping deck.                                 |
| `expandOnPress`           | `false`        | Expands a collapsed stack when its front toast is pressed.                 |
| `haptic`                  | `false`        | Default haptic setting.                                                    |
| `icons`                   | —              | Replaces the icon for `success`, `error`, `warning`, `info`, or `loading`. |
| `toastOptions`            | —              | Default styles, including per-variant container styles.                    |

## Styling

Android draws toasts with native views, so styles use a fixed set of keys that
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
  buttons do not accept React elements. This lets Android render toasts in
  native windows above modals.
- Styles are limited to the keys listed in [Styling](#styling).
- Plain `toast()` shows no icon.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
