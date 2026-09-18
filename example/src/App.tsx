import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementRef, ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { fontIcon, toast, ToastHost } from 'react-native-super-toast';
import type {
  ToastHostProps,
  ToastId,
  ToastPosition,
  ToastSwipeDirection,
  ToastTheme,
} from 'react-native-super-toast';
import { FontAwesomeFreeSolid } from '@react-native-vector-icons/fontawesome-free-solid';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const COLORS = {
  ink: '#171717',
  paper: '#F7F7F5',
  white: '#FFFFFF',
  muted: '#717171',
  line: '#E5E5E2',
  soft: '#F0F0EE',
} as const;

// Multiple snap points let every sheet be resized by dragging its handle.
const SHEET_SNAP_POINTS = ['45%', '70%', '92%'];
const SETTINGS_SNAP_POINTS = ['60%', '92%'];

const POSITIONS: ToastPosition[] = ['top-center', 'bottom-center', 'center'];
const THEMES: ToastTheme[] = ['system', 'light', 'dark'];
const SWIPE_DIRECTIONS: ToastSwipeDirection[] = ['up', 'down', 'left', 'right'];

const DURATIONS = ['2s', '4s', '8s', 'forever'] as const;
const STYLE_PRESETS = ['default', 'compact', 'outline', 'brand'] as const;

type DurationOption = (typeof DURATIONS)[number];
type StylePreset = (typeof STYLE_PRESETS)[number];

type DemoSettings = {
  position: ToastPosition;
  offsetTop?: number;
  offsetBottom?: number;
  gap: number;
  visibleToasts: number;
  theme: ToastTheme;
  richColors: boolean;
  invert: boolean;
  stylePreset: StylePreset;
  customIcons: boolean;
  duration: DurationOption;
  swipeDirection: ToastSwipeDirection;
  closeButton: boolean;
  enableStacking: boolean;
  expandOnPress: boolean;
  haptic: boolean;
};

const DEFAULT_SETTINGS: DemoSettings = {
  position: 'top-center',
  gap: 14,
  visibleToasts: 3,
  theme: 'system',
  richColors: false,
  invert: false,
  stylePreset: 'default',
  customIcons: false,
  duration: '4s',
  swipeDirection: 'up',
  closeButton: false,
  enableStacking: false,
  expandOnPress: false,
  haptic: false,
};

const DURATION_MS: Record<DurationOption, number> = {
  '2s': 2000,
  '4s': 4000,
  '8s': 8000,
  'forever': Infinity,
};

const STYLE_PRESET_OPTIONS: Record<
  StylePreset,
  ToastHostProps['toastOptions']
> = {
  default: undefined,
  compact: {
    style: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    titleStyle: { fontSize: 13, lineHeight: 18 },
    descriptionStyle: { fontSize: 12, lineHeight: 16 },
  },
  outline: {
    style: { borderWidth: 1, borderColor: '#B8B8B3', borderRadius: 12 },
    actionButtonStyle: { borderRadius: 6 },
  },
  brand: {
    style: { borderRadius: 4 },
    titleStyle: { fontFamily: 'Karla-Bold', fontSize: 15 },
    descriptionStyle: { fontFamily: 'Karla-Italic' },
    actionButtonStyle: { backgroundColor: '#35A85A', borderWidth: 0 },
    actionButtonTextStyle: { color: COLORS.white },
    success: { borderWidth: 1, borderColor: '#35A85A' },
    error: { borderWidth: 1, borderColor: '#E5484D' },
  },
};

const CUSTOM_ICONS: ToastHostProps['icons'] = {
  success: '🎉',
  error: '🚫',
  warning: '⚡️',
  info: '💡',
};
const SETTINGS_BUTTON_RIGHT = 20;
const SETTINGS_BUTTON_BOTTOM = 48;
const SETTINGS_BUTTON_EDGE_GAP = 12;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ActionButton({
  children,
  onPress,
  tone,
}: {
  children: ReactNode;
  onPress: () => void;
  tone?: 'dark';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'dark' && styles.buttonDark,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[styles.buttonLabel, tone === 'dark' && styles.buttonLabelDark]}
      >
        {children}
      </Text>
      <Text
        style={[styles.buttonValue, tone === 'dark' && styles.buttonLabelDark]}
      >
        ›
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.actionList}>{children}</View>
    </View>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function SettingChoice<T extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {values.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option}`}
            accessibilityState={{ selected: option === value }}
            onPress={() => onChange(option)}
            style={[styles.choice, option === value && styles.choiceSelected]}
          >
            <Text
              style={[
                styles.choiceText,
                option === value && styles.choiceTextSelected,
              ]}
            >
              {option.replace('-', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.settingGroup}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** `undefined` means the library default, shown as "Default". */
function SettingStepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit = '',
  defaultValue,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  /** Where stepping starts from when the value is unset. */
  defaultValue?: number;
}) {
  const current = value ?? defaultValue ?? min;
  const change = (delta: number) =>
    onChange(Math.max(min, Math.min(max, current + delta)));
  const canReset = defaultValue !== undefined && value !== undefined;

  return (
    <View style={styles.toggleRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.stepper}>
        {canReset ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reset ${label}`}
            onPress={() => onChange(undefined)}
            style={styles.stepperReset}
          >
            <Text style={styles.stepperResetText}>reset</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={value !== undefined && current <= min}
          onPress={() => change(-step)}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value === undefined && defaultValue !== undefined
            ? 'Default'
            : `${value ?? current}${unit}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={current >= max}
          onPress={() => change(step)}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.line, true: COLORS.ink }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

function DraggableSettingsButton({ onPress }: { onPress: () => void }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [buttonSize, setButtonSize] = useState({ width: 0, height: 0 });
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const initialTop = windowHeight - SETTINGS_BUTTON_BOTTOM - buttonSize.height;
  const minX =
    buttonSize.width > 0
      ? -(windowWidth - buttonSize.width - SETTINGS_BUTTON_RIGHT * 2)
      : 0;
  const minY =
    buttonSize.height > 0
      ? insets.top + SETTINGS_BUTTON_EDGE_GAP - initialTop
      : 0;
  const maxY =
    SETTINGS_BUTTON_BOTTOM - insets.bottom - SETTINGS_BUTTON_EDGE_GAP;

  useEffect(() => {
    translateX.value = Math.max(minX, Math.min(0, translateX.value));
    translateY.value = Math.max(minY, Math.min(maxY, translateY.value));
  }, [maxY, minX, minY, translateX, translateY]);

  const dragGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.max(
        minX,
        Math.min(0, dragStartX.value + event.translationX)
      );
      translateY.value = Math.max(
        minY,
        Math.min(maxY, dragStartY.value + event.translationY)
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        onLayout={({ nativeEvent }) =>
          setButtonSize({
            width: nativeEvent.layout.width,
            height: nativeEvent.layout.height,
          })
        }
        style={[styles.settingsButtonContainer, animatedStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open toast settings"
          accessibilityHint="Drag to reposition"
          onPress={onPress}
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
          <Text style={styles.settingsButtonText}>Settings</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

// Font icons need the family name each platform registers for the font file.
const FONT_AWESOME_FAMILY = Platform.select({
  android: 'fa-solid-900',
  default: 'FontAwesome7Free-Solid',
});
const BELL_GLYPH = 0xf0f3;

type Demo = {
  label: string;
  /** Returns the toast id so "Wiggle" can target the latest toast. */
  run: () => ToastId | void;
};

type DemoSection = {
  title: string;
  demos: Demo[];
};

function useDemoSections(iconColor: string): DemoSection[] {
  const lastId = useRef<ToastId | null>(null);
  const bellImage = useMemo(
    () =>
      FontAwesomeFreeSolid.getImageSourceSync('bell', {
        size: 20,
        color: iconColor,
      }),
    [iconColor]
  );

  return useMemo<DemoSection[]>(() => {
    const track = (demo: Demo): Demo => ({
      label: demo.label,
      run: () => {
        const id = demo.run();
        if (id !== undefined) lastId.current = id;
        return id;
      },
    });

    const sections: DemoSection[] = [
      {
        title: 'TYPES',
        demos: [
          { label: 'Default', run: () => toast('Event has been created') },
          {
            label: 'Description',
            run: () =>
              toast('Event has been created', {
                description: 'Monday, January 3rd at 6:00 PM',
              }),
          },
          {
            label: 'Success',
            run: () =>
              toast.success('Changes saved', {
                description: 'Your changes have been saved successfully.',
              }),
          },
          {
            label: 'Error',
            run: () =>
              toast.error('Couldn’t save changes', {
                description: 'Check your connection and try again.',
              }),
          },
          {
            label: 'Warning',
            run: () =>
              toast.warning('Storage almost full', {
                description: 'You’ve used 90% of your storage.',
              }),
          },
          {
            label: 'Info',
            run: () =>
              toast.info('Update available', {
                description: 'Restart the app to install version 2.1.',
              }),
          },
          {
            label: 'Loading',
            run: () => toast.loading('Uploading file…', { duration: 3000 }),
          },
        ],
      },
      {
        title: 'ACTIONS',
        demos: [
          {
            label: 'Action',
            run: () =>
              toast('Message archived', {
                action: {
                  label: 'Undo',
                  onClick: () => toast.success('Message restored'),
                },
              }),
          },
          {
            label: 'Action and cancel',
            run: () =>
              toast('Delete 3 files?', {
                description: 'This can’t be undone.',
                duration: Infinity,
                action: {
                  label: 'Delete',
                  onClick: () => toast.success('Files deleted'),
                },
                cancel: { label: 'Cancel', onClick: () => {} },
              }),
          },
          {
            label: 'Close button',
            run: () =>
              toast.success('Changes saved', {
                description: 'Your changes have been saved successfully.',
                closeButton: true,
              }),
          },
          {
            label: 'Press handler',
            run: () =>
              toast.info('New comment on your post', {
                description: 'Tap to view the conversation.',
                onPress: () => toast('Opening conversation…'),
              }),
          },
        ],
      },
      {
        title: 'UPDATES',
        demos: [
          {
            label: 'Promise (resolves)',
            run: () =>
              toast.promise(wait(2000), {
                loading: 'Saving changes…',
                success: 'Changes saved',
                error: 'Couldn’t save changes',
              }),
          },
          {
            label: 'Promise (rejects)',
            run: () =>
              toast.promise(
                wait(2000).then(() => {
                  throw new Error('Server is not responding');
                }),
                {
                  loading: 'Saving changes…',
                  success: 'Changes saved',
                  error: (reason) => (reason as Error).message,
                }
              ),
          },
          {
            label: 'Update in place',
            run: () => {
              const id = toast.loading('Uploading 1 of 3…');
              setTimeout(
                () => toast.loading('Uploading 2 of 3…', { id }),
                1000
              );
              setTimeout(
                () => toast.loading('Uploading 3 of 3…', { id }),
                2000
              );
              setTimeout(
                () =>
                  toast.success('Upload complete', {
                    id,
                    description: '3 files uploaded.',
                  }),
                3000
              );
              return id;
            },
          },
          {
            label: 'Wiggle latest toast',
            run: () => {
              if (lastId.current === null) {
                return toast('Show a toast first, then wiggle it');
              }
              toast.wiggle(lastId.current);
              return undefined;
            },
          },
        ],
      },
      {
        title: 'CUSTOMIZATION',
        demos: [
          {
            label: 'Custom style',
            run: () =>
              toast.success('Changes saved', {
                description:
                  'Your changes have been saved successfully. Long text wraps onto new lines.',
                action: { label: 'See changes', onClick: () => {} },
                style: { backgroundColor: COLORS.ink, borderRadius: 12 },
                styles: {
                  title: { color: COLORS.white },
                  description: { color: '#C8C8C3' },
                  icon: { color: '#7EE2A8' },
                  closeButtonIcon: { color: COLORS.white },
                },
                actionButtonStyle: {
                  backgroundColor: '#2B2B2B',
                  borderColor: '#2B2B2B',
                },
                actionButtonTextStyle: { color: COLORS.white },
              }),
          },
          {
            label: 'Custom font',
            run: () =>
              toast('Welcome back, Maya', {
                description: 'You have 3 unread messages.',
                styles: {
                  title: { fontFamily: 'Karla-Bold', fontSize: 16 },
                  description: { fontFamily: 'Karla-Italic' },
                },
              }),
          },
          {
            label: 'Rich colors',
            run: () =>
              toast.error('Payment failed', {
                description: 'Your card was declined.',
                richColors: true,
              }),
          },
          {
            label: 'Emoji icon',
            run: () =>
              toast('You reached 1,000 followers', {
                icon: '🎉',
              }),
          },
          {
            label: 'Image icon',
            run: () =>
              toast('Reminder set', {
                description: 'We’ll notify you 10 minutes before.',
                icon: { type: 'image', source: bellImage, size: 20 },
              }),
          },
          {
            label: 'Font icon',
            run: () =>
              toast('Notifications enabled', {
                icon: fontIcon({
                  glyph: BELL_GLYPH,
                  fontFamily: FONT_AWESOME_FAMILY,
                  size: 18,
                }),
              }),
          },
          {
            label: 'Haptic',
            run: () => toast.success('Payment sent', { haptic: true }),
          },
          {
            label: 'No auto-dismiss',
            run: () =>
              toast.info('Session expires soon', {
                description: 'Swipe or tap × to dismiss.',
                duration: Infinity,
                closeButton: true,
              }),
          },
        ],
      },
      {
        title: 'MULTIPLE',
        demos: [
          {
            label: 'Show three toasts',
            run: () => {
              ['Changes saved', 'File uploaded', 'Invite sent'].forEach(
                (title, index) =>
                  setTimeout(() => toast.success(title), index * 350)
              );
            },
          },
          {
            label: 'Dismiss all',
            run: () => {
              toast.dismiss();
            },
          },
        ],
      },
    ];

    return sections.map((section) => ({
      ...section,
      demos: section.demos.map(track),
    }));
  }, [bellImage]);
}

function DemoSections({ sections }: { sections: DemoSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.demos.map((demo) => (
            <ActionButton key={demo.label} onPress={demo.run}>
              {demo.label}
            </ActionButton>
          ))}
        </Section>
      ))}
    </>
  );
}

/** Bottom and center toasts should move above the keyboard; top toasts stay put. */
function KeyboardDemo({ inSheet = false }: { inSheet?: boolean }) {
  // Sheets need their own input so the sheet moves with the keyboard.
  const Input = inSheet ? BottomSheetTextInput : TextInput;
  const show = (position: ToastPosition) =>
    toast(`${position.replace('-', ' ')} toast`, {
      description: 'Open and close the keyboard while this is visible.',
      position,
    });

  return (
    <Section title="KEYBOARD">
      <Input
        accessibilityLabel="Keyboard test input"
        placeholder="Tap here to open the keyboard"
        placeholderTextColor={COLORS.muted}
        style={styles.input}
      />
      <ActionButton onPress={() => show('bottom-center')}>
        Bottom toast
      </ActionButton>
      <ActionButton
        onPress={() =>
          ['Changes saved', 'File uploaded', 'Invite sent'].forEach(
            (title, index) =>
              setTimeout(
                () => toast.success(title, { position: 'bottom-center' }),
                index * 350
              )
          )
        }
      >
        Three bottom toasts
      </ActionButton>
      <ActionButton onPress={Keyboard.dismiss} tone="dark">
        Hide keyboard
      </ActionButton>
    </Section>
  );
}

/** A short set of toasts for checking rendering above modals and sheets. */
function OverlayDemo({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.actionList}>
      <ActionButton
        onPress={() =>
          toast.success('Changes saved', {
            description: 'Your changes have been saved successfully.',
          })
        }
      >
        Show success toast
      </ActionButton>
      <ActionButton
        onPress={() =>
          toast('Message archived', {
            action: {
              label: 'Undo',
              onClick: () => toast.success('Message restored'),
            },
          })
        }
      >
        Show toast with action
      </ActionButton>
      <ActionButton onPress={onClose} tone="dark">
        Close
      </ActionButton>
    </View>
  );
}

export default function App() {
  const [settings, setSettings] = useState<DemoSettings>(DEFAULT_SETTINGS);
  const update = <K extends keyof DemoSettings>(
    key: K,
    value: DemoSettings[K]
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const systemScheme = useColorScheme();
  const darkTheme =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && systemScheme === 'dark');
  // Image icons are not themed natively, so tint them to match the toast theme.
  const iconColor = darkTheme !== settings.invert ? COLORS.white : COLORS.ink;
  const sections = useDemoSections(iconColor);

  const [pageSheetVisible, setPageSheetVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const bottomSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const sheetModalRef = useRef<BottomSheetModal>(null);
  const nestedSheetModalRef = useRef<BottomSheetModal>(null);

  // Covers every variant plus buttons, so each setting is visible at once.
  const showPreview = () => {
    toast.success('Changes saved', {
      description: 'Your changes have been saved successfully.',
    });
    setTimeout(
      () =>
        toast.error('Couldn’t save changes', {
          action: { label: 'Retry', onClick: () => toast('Retrying…') },
        }),
      300
    );
    setTimeout(
      () =>
        toast.warning('Storage almost full', {
          description: 'You’ve used 90% of your storage.',
          cancel: { label: 'Dismiss', onClick: () => {} },
        }),
      600
    );
    setTimeout(() => toast.info('Update available'), 900);
  };

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      opacity={0.55}
    />
  );

  return (
    <SafeAreaProvider style={styles.root}>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <BottomSheetModalProvider>
          <SafeAreaView style={styles.root}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              // Buttons stay tappable without closing the keyboard.
              keyboardShouldPersistTaps="handled"
            >
              <PageHeader
                title="Super Toast"
                subtitle="Native toasts that render above modals and bottom sheets. Use Settings to change how they look and behave."
              />

              <KeyboardDemo />

              <DemoSections sections={sections} />

              <Section title="ABOVE EVERYTHING">
                <ActionButton onPress={() => setPageSheetVisible(true)}>
                  Page sheet modal
                </ActionButton>
                <ActionButton onPress={() => setTransparentModalVisible(true)}>
                  Transparent modal
                </ActionButton>
                <ActionButton
                  onPress={() => bottomSheetRef.current?.snapToIndex(0)}
                >
                  Bottom sheet
                </ActionButton>
                <ActionButton onPress={() => sheetModalRef.current?.present()}>
                  Stacked bottom sheet modals
                </ActionButton>
              </Section>
            </ScrollView>

            <DraggableSettingsButton
              onPress={() => settingsSheetRef.current?.present()}
            />

            <BottomSheetModal
              ref={settingsSheetRef}
              index={0}
              snapPoints={SETTINGS_SNAP_POINTS}
              enableDynamicSizing={false}
              enablePanDownToClose
              backdropComponent={renderBackdrop}
              backgroundStyle={styles.settingsSheetBackground}
              handleIndicatorStyle={styles.sheetHandle}
            >
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Settings</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close toast settings"
                  onPress={() => settingsSheetRef.current?.dismiss()}
                  style={styles.settingsClose}
                >
                  <Text style={styles.settingsCloseText}>×</Text>
                </Pressable>
              </View>
              <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.settingsContent}
              >
                <SettingGroup title="LAYOUT">
                  <SettingChoice
                    label="Position"
                    values={POSITIONS}
                    value={settings.position}
                    onChange={(value) => update('position', value)}
                  />
                  <SettingStepper
                    label="Top offset"
                    value={settings.offsetTop}
                    onChange={(value) => update('offsetTop', value)}
                    step={8}
                    min={0}
                    max={200}
                    unit="pt"
                    defaultValue={8}
                  />
                  <SettingStepper
                    label="Bottom offset"
                    value={settings.offsetBottom}
                    onChange={(value) => update('offsetBottom', value)}
                    step={8}
                    min={0}
                    max={200}
                    unit="pt"
                    defaultValue={8}
                  />
                  <SettingStepper
                    label="Gap"
                    value={settings.gap}
                    onChange={(value) =>
                      update('gap', value ?? DEFAULT_SETTINGS.gap)
                    }
                    step={2}
                    min={0}
                    max={40}
                    unit="pt"
                  />
                  <SettingStepper
                    label="Visible toasts"
                    value={settings.visibleToasts}
                    onChange={(value) =>
                      update(
                        'visibleToasts',
                        value ?? DEFAULT_SETTINGS.visibleToasts
                      )
                    }
                    step={1}
                    min={1}
                    max={6}
                  />
                  <SettingToggle
                    label="Stacking"
                    value={settings.enableStacking}
                    onChange={(value) => update('enableStacking', value)}
                  />
                  <SettingToggle
                    label="Expand stack on press"
                    value={settings.expandOnPress}
                    onChange={(value) => update('expandOnPress', value)}
                  />
                </SettingGroup>

                <SettingGroup title="APPEARANCE">
                  <SettingChoice
                    label="Theme"
                    values={THEMES}
                    value={settings.theme}
                    onChange={(value) => update('theme', value)}
                  />
                  <SettingChoice
                    label="Style preset"
                    values={STYLE_PRESETS}
                    value={settings.stylePreset}
                    onChange={(value) => update('stylePreset', value)}
                  />
                  <SettingToggle
                    label="Rich colors"
                    value={settings.richColors}
                    onChange={(value) => update('richColors', value)}
                  />
                  <SettingToggle
                    label="Invert theme"
                    value={settings.invert}
                    onChange={(value) => update('invert', value)}
                  />
                  <SettingToggle
                    label="Custom variant icons"
                    value={settings.customIcons}
                    onChange={(value) => update('customIcons', value)}
                  />
                </SettingGroup>

                <SettingGroup title="BEHAVIOR">
                  <SettingChoice
                    label="Duration"
                    values={DURATIONS}
                    value={settings.duration}
                    onChange={(value) => update('duration', value)}
                  />
                  <SettingChoice
                    label="Swipe direction"
                    values={SWIPE_DIRECTIONS}
                    value={settings.swipeDirection}
                    onChange={(value) => update('swipeDirection', value)}
                  />
                  <SettingToggle
                    label="Close button"
                    value={settings.closeButton}
                    onChange={(value) => update('closeButton', value)}
                  />
                  <SettingToggle
                    label="Haptics"
                    value={settings.haptic}
                    onChange={(value) => update('haptic', value)}
                  />
                </SettingGroup>

                <View style={styles.settingsActions}>
                  <ActionButton onPress={showPreview} tone="dark">
                    Preview toasts
                  </ActionButton>
                  <ActionButton onPress={() => setSettings(DEFAULT_SETTINGS)}>
                    Reset to defaults
                  </ActionButton>
                </View>
              </BottomSheetScrollView>
            </BottomSheetModal>

            <Modal
              visible={pageSheetVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setPageSheetVisible(false)}
            >
              <GestureHandlerRootView style={styles.modalRoot}>
                <SafeAreaProvider style={styles.modalRoot}>
                  <SafeAreaView style={styles.modalRoot}>
                    <View style={styles.sheetContent}>
                      <PageHeader
                        title="Page sheet modal"
                        subtitle="Toasts should appear above this modal."
                      />
                      <OverlayDemo onClose={() => setPageSheetVisible(false)} />
                    </View>
                  </SafeAreaView>
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </Modal>

            <Modal
              visible={transparentModalVisible}
              animationType="fade"
              transparent
              statusBarTranslucent
              onRequestClose={() => setTransparentModalVisible(false)}
            >
              <GestureHandlerRootView style={styles.transparentBackdrop}>
                <View style={styles.transparentModalCard}>
                  <PageHeader
                    title="Transparent modal"
                    subtitle="Toasts should appear above the dimmed backdrop."
                  />
                  <OverlayDemo
                    onClose={() => setTransparentModalVisible(false)}
                  />
                </View>
              </GestureHandlerRootView>
            </Modal>

            {/* A closed Android backdrop can intercept touches after RN Modals close. */}
            <BottomSheet
              ref={bottomSheetRef}
              index={-1}
              snapPoints={SHEET_SNAP_POINTS}
              enableDynamicSizing={false}
              enablePanDownToClose
              keyboardBlurBehavior="restore"
              android_keyboardInputMode="adjustResize"
              backdropComponent={
                Platform.OS === 'android' ? undefined : renderBackdrop
              }
              backgroundStyle={styles.sheetBackground}
              handleIndicatorStyle={styles.sheetHandle}
            >
              <BottomSheetScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
              >
                <PageHeader
                  title="Bottom sheet"
                  subtitle="Toasts should appear above this sheet and stay clear of the keyboard."
                />
                <KeyboardDemo inSheet />
                <OverlayDemo onClose={() => bottomSheetRef.current?.close()} />
              </BottomSheetScrollView>
            </BottomSheet>

            <BottomSheetModal
              ref={sheetModalRef}
              stackBehavior="push"
              index={0}
              snapPoints={SHEET_SNAP_POINTS}
              enableDynamicSizing={false}
              enablePanDownToClose
              backdropComponent={renderBackdrop}
              backgroundStyle={styles.sheetBackground}
              handleIndicatorStyle={styles.sheetHandle}
            >
              <BottomSheetScrollView
                contentContainerStyle={styles.sheetContent}
              >
                <PageHeader
                  title="Bottom sheet modal"
                  subtitle="Open another sheet on top to test stacking."
                />
                <ActionButton
                  onPress={() => nestedSheetModalRef.current?.present()}
                >
                  Open another sheet
                </ActionButton>
                <OverlayDemo onClose={() => sheetModalRef.current?.dismiss()} />
              </BottomSheetScrollView>
            </BottomSheetModal>

            <BottomSheetModal
              ref={nestedSheetModalRef}
              stackBehavior="push"
              index={0}
              snapPoints={SHEET_SNAP_POINTS}
              enableDynamicSizing={false}
              enablePanDownToClose
              backdropComponent={renderBackdrop}
              backgroundStyle={styles.sheetBackground}
              handleIndicatorStyle={styles.sheetHandle}
            >
              <BottomSheetScrollView
                contentContainerStyle={styles.sheetContent}
              >
                <PageHeader
                  title="Nested sheet"
                  subtitle="Toasts should still appear above both sheets."
                />
                <OverlayDemo
                  onClose={() => nestedSheetModalRef.current?.dismiss()}
                />
              </BottomSheetScrollView>
            </BottomSheetModal>

            <ToastHost
              position={settings.position}
              offset={{
                top: settings.offsetTop,
                bottom: settings.offsetBottom,
              }}
              gap={settings.gap}
              visibleToasts={settings.visibleToasts}
              theme={settings.theme}
              richColors={settings.richColors}
              invert={settings.invert}
              toastOptions={STYLE_PRESET_OPTIONS[settings.stylePreset]}
              icons={settings.customIcons ? CUSTOM_ICONS : undefined}
              duration={DURATION_MS[settings.duration]}
              swipeToDismissDirection={settings.swipeDirection}
              closeButton={settings.closeButton}
              enableStacking={settings.enableStacking}
              expandOnPress={settings.expandOnPress}
              haptic={settings.haptic}
            />
          </SafeAreaView>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.paper },
  modalRoot: { flex: 1, backgroundColor: COLORS.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 110,
    gap: 26,
  },
  header: { paddingTop: 4, gap: 5 },
  title: {
    color: COLORS.ink,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  section: { gap: 10 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionList: { gap: 7 },
  button: {
    minHeight: 49,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDark: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  buttonPressed: { opacity: 0.68 },
  buttonLabel: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonLabelDark: { color: COLORS.white },
  buttonValue: { color: COLORS.muted, fontSize: 18 },
  input: {
    minHeight: 49,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    color: COLORS.ink,
    fontSize: 14,
  },
  settingsButtonContainer: {
    position: 'absolute',
    right: SETTINGS_BUTTON_RIGHT,
    bottom: SETTINGS_BUTTON_BOTTOM,
    borderRadius: 25,
    elevation: 6,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  settingsButton: {
    minHeight: 49,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsIcon: { color: COLORS.white, fontSize: 21, lineHeight: 25 },
  settingsButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  settingsHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  settingsTitle: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  settingsClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCloseText: { color: COLORS.muted, fontSize: 25, lineHeight: 28 },
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
  },
  settingRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    gap: 10,
  },
  settingLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.soft,
  },
  choiceSelected: { backgroundColor: COLORS.ink },
  choiceText: { color: COLORS.ink, fontSize: 12 },
  choiceTextSelected: { color: COLORS.white },
  settingGroup: { paddingTop: 22 },
  settingsActions: { paddingTop: 24, gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.soft,
  },
  stepperButtonText: { color: COLORS.ink, fontSize: 18, lineHeight: 21 },
  stepperValue: {
    minWidth: 58,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepperReset: { paddingHorizontal: 6, paddingVertical: 8 },
  stepperResetText: { color: COLORS.muted, fontSize: 12 },
  toggleRow: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  transparentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  transparentModalCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 20,
    gap: 18,
  },
  sheetBackground: { backgroundColor: COLORS.paper },
  settingsSheetBackground: { backgroundColor: COLORS.white },
  sheetHandle: { backgroundColor: COLORS.muted, width: 36 },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
});
