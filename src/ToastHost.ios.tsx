import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { LayoutChangeEvent, TextStyle, ViewStyle } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import type {
  NativeTextStyle,
  NativeToastButton,
  NativeToastOptions,
} from './NativeSuperToast';
import { Glyph } from './icons';
import type { GlyphName } from './icons';
import {
  completeRemove,
  dismissFromToast,
  getSnapshot,
  press,
  subscribe,
  triggerHaptic,
} from './iosToastStore';
import type { StoreToast } from './iosToastStore';
import { computeLayout } from './layout';
import { setToastHostConfig } from './resolve';
import {
  isHorizontalSwipe,
  normalizeSwipeOffset,
  swipeTranslation,
} from './swipe';
import type {
  ToastPosition,
  ToastHostProps,
  ToastSwipeDirection,
} from './types';

const POSITIONS: ToastPosition[] = ['top-center', 'bottom-center', 'center'];
const ENTER_DURATION = 300;
const EXIT_DURATION = 300;
const REFLOW_DURATION = 400;
const DEFAULT_OFFSET = 8;

const easeOutQuart = Easing.bezier(0.165, 0.84, 0.44, 1);
const easeInOutCubic = Easing.bezier(0.645, 0.045, 0.355, 1);

const textStyle = (style: NativeTextStyle): TextStyle => ({
  ...style,
  fontWeight: style.fontWeight as TextStyle['fontWeight'],
});

/** Diminishing drag distance when swiping away from the dismiss direction. */
function elasticResistance(distance: number): number {
  return distance * 0.4 * (1 / (1 + distance * 0.02));
}

function ToastIcon({ options }: { options: NativeToastOptions }) {
  const { icon, iconColor, variant } = options;

  if (icon?.type === 'image' && icon.uri) {
    return (
      <Image
        source={{ uri: icon.uri }}
        resizeMode="contain"
        style={{
          width: icon.width ?? icon.size ?? 20,
          height: icon.height ?? icon.size ?? 20,
          borderRadius: icon.cornerRadius ?? 0,
          tintColor: icon.tintColor,
        }}
      />
    );
  }

  const value = icon?.type === 'font' ? icon.glyph : icon?.value;
  if (icon && value) {
    return (
      <Text
        style={{
          color: icon.color ?? iconColor,
          fontFamily: icon.type === 'font' ? icon.fontFamily : undefined,
          fontSize: icon.size ?? 20,
          lineHeight: icon.size ?? 20,
        }}
      >
        {value}
      </Text>
    );
  }

  if (variant === 'loading') {
    return (
      <ActivityIndicator color={iconColor} size="small" style={styles.icon} />
    );
  }

  if (variant === 'default') return null;

  return <Glyph name={variant as GlyphName} size={20} color={iconColor} />;
}

function ToastButton({
  button,
  onPress,
}: {
  button: NativeToastButton;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        button.style,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={1} style={textStyle(button.textStyle)}>
        {button.label}
      </Text>
    </Pressable>
  );
}

type ToastCardProps = {
  toast: StoreToast;
  position: ToastPosition;
  /** Undefined while the card is exiting, so it keeps its last position. */
  translateY?: number;
  scale: number;
  depth: number;
  stacked: boolean;
  hasSiblings: boolean;
  onCardPress: () => void;
  reportHeight: (key: number, height: number) => void;
};

function ToastCard({
  toast,
  position,
  translateY,
  scale,
  depth,
  stacked,
  hasSiblings,
  onCardPress,
  reportHeight,
}: ToastCardProps) {
  const { key, options, dismissing, revision, wiggle } = toast;
  const { id, duration, dismissible } = options;
  const { width: windowWidth } = useWindowDimensions();
  const swipeDirection = options.swipeDirection as ToastSwipeDirection;
  const horizontalSwipe = isHorizontalSwipe(swipeDirection);

  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(
    new Animated.Value(position === 'top-center' ? -20 : 50)
  ).current;
  const layoutY = useRef(new Animated.Value(translateY ?? 0)).current;
  const stackScale = useRef(new Animated.Value(scale)).current;
  const swipe = useRef(new Animated.Value(0)).current;
  const wiggleScale = useRef(new Animated.Value(1)).current;

  const measured = useRef(false);
  const positioned = useRef(false);
  const swipedAway = useRef(false);
  const exitStarted = useRef(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerPaused = useRef(false);
  const remaining = useRef(0);
  const startedAt = useRef(0);

  const clearTimer = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const startTimer = useCallback(
    (delay: number) => {
      clearTimer();
      timerPaused.current = false;
      remaining.current = delay;
      startedAt.current = Date.now();
      timer.current = setTimeout(() => {
        timer.current = null;
        dismissFromToast(id, 'autoClose');
      }, delay);
    },
    [clearTimer, id]
  );

  const pauseTimer = useCallback(() => {
    if (!timer.current) return;
    clearTimer();
    timerPaused.current = true;
    remaining.current -= Date.now() - startedAt.current;
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (!timerPaused.current) return;
    startTimer(Math.max(remaining.current, 1000));
  }, [startTimer]);

  useEffect(() => {
    if (dismissing || duration <= 0) return;
    startTimer(duration);
    return clearTimer;
  }, [clearTimer, dismissing, duration, revision, startTimer]);

  useEffect(() => {
    if (options.haptic) triggerHaptic();
  }, [options.haptic, revision]);

  useEffect(() => {
    if (translateY === undefined) return;
    if (!positioned.current) {
      layoutY.setValue(translateY);
      return;
    }
    Animated.timing(layoutY, {
      toValue: translateY,
      duration: REFLOW_DURATION,
      easing: easeOutQuart,
      useNativeDriver: true,
    }).start();
  }, [layoutY, translateY]);

  useEffect(() => {
    Animated.timing(stackScale, {
      toValue: scale,
      duration: REFLOW_DURATION,
      easing: easeOutQuart,
      useNativeDriver: true,
    }).start();
  }, [scale, stackScale]);

  useEffect(() => {
    if (!dismissing || exitStarted.current) return;
    exitStarted.current = true;

    if (swipedAway.current) {
      completeRemove(key);
      return;
    }

    const direction = position === 'top-center' ? -1 : 1;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        easing: easeInOutCubic,
        useNativeDriver: true,
      }),
      Animated.timing(offset, {
        toValue: direction * (hasSiblings ? 8 : 150),
        duration: EXIT_DURATION,
        easing: easeInOutCubic,
        useNativeDriver: true,
      }),
    ]).start(() => completeRemove(key));
  }, [dismissing, hasSiblings, key, offset, opacity, position]);

  useEffect(() => {
    if (wiggle === 0) return;
    const step = (toValue: number) =>
      Animated.timing(wiggleScale, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      });
    Animated.sequence([step(1.035), step(1), step(1.035), step(1)]).start();
  }, [wiggle, wiggleScale]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      reportHeight(key, event.nativeEvent.layout.height);
      if (measured.current) return;
      measured.current = true;

      requestAnimationFrame(() => {
        positioned.current = true;
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: ENTER_DURATION,
            easing: easeOutQuart,
            useNativeDriver: true,
          }),
          Animated.timing(offset, {
            toValue: 0,
            duration: ENTER_DURATION,
            easing: easeOutQuart,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [key, offset, opacity, reportHeight]
  );

  const panResponder = useMemo(() => {
    const swipeValue = (dx: number, dy: number) => {
      const raw = normalizeSwipeOffset(swipeDirection, dx, dy);
      return raw < 0 ? raw : elasticResistance(raw);
    };

    const restore = () => {
      Animated.timing(swipe, {
        toValue: 0,
        duration: 250,
        easing: easeOutQuart,
        useNativeDriver: true,
      }).start();
      resumeTimer();
    };

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        dismissible &&
        (horizontalSwipe
          ? Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)
          : Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)),
      onPanResponderGrant: pauseTimer,
      onPanResponderMove: (_, { dx, dy }) => swipe.setValue(swipeValue(dx, dy)),
      onPanResponderRelease: (_, { dx, dy, vx, vy }) => {
        const value = swipeValue(dx, dy);
        const velocity = normalizeSwipeOffset(swipeDirection, vx, vy);
        const shouldDismiss =
          velocity < -0.8 ||
          (horizontalSwipe ? value < -windowWidth * 0.25 : value < -20);

        if (!shouldDismiss) {
          restore();
          return;
        }

        Animated.timing(swipe, {
          toValue: horizontalSwipe ? -windowWidth : -150,
          duration: 200,
          easing: easeInOutCubic,
          useNativeDriver: true,
        }).start(() => {
          swipedAway.current = true;
          dismissFromToast(id, 'dismiss');
        });
      },
      onPanResponderTerminate: restore,
    });
  }, [
    dismissible,
    horizontalSwipe,
    id,
    pauseTimer,
    resumeTimer,
    swipe,
    swipeDirection,
    windowWidth,
  ]);

  const swipeOpacity = swipe.interpolate({
    inputRange: [horizontalSwipe ? -windowWidth : -60, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const label = [options.title, options.description].filter(Boolean).join('. ');
  const slotStyle: ViewStyle =
    position === 'bottom-center'
      ? { bottom: 0, transformOrigin: 'top' }
      : {
          top: 0,
          transformOrigin: position === 'center' ? 'center' : 'bottom',
        };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.slot,
        slotStyle,
        {
          zIndex: 100 - depth,
          opacity: Animated.multiply(opacity, swipeOpacity),
          transform: [
            { translateY: layoutY },
            { translateY: offset },
            horizontalSwipe
              ? {
                  translateX: Animated.multiply(
                    swipe,
                    swipeTranslation(swipeDirection, 1)
                  ),
                }
              : {
                  translateY: Animated.multiply(
                    swipe,
                    swipeTranslation(swipeDirection, 1)
                  ),
                },
            { scale: Animated.multiply(stackScale, wiggleScale) },
          ],
        },
      ]}
    >
      <View
        onLayout={handleLayout}
        pointerEvents={dismissing || (stacked && depth > 0) ? 'none' : 'auto'}
        style={styles.frame}
        {...panResponder.panHandlers}
      >
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="alert"
          onPress={onCardPress}
          style={[styles.card, options.style]}
        >
          <View
            style={[
              styles.content,
              !options.description && styles.contentCentered,
            ]}
          >
            <ToastIcon options={options} />
            <View style={styles.texts}>
              {options.title ? (
                <Text style={textStyle(options.titleStyle)}>
                  {options.title}
                </Text>
              ) : null}
              {options.description ? (
                <Text
                  style={[
                    styles.description,
                    textStyle(options.descriptionStyle),
                  ]}
                >
                  {options.description}
                </Text>
              ) : null}
              {options.action || options.cancel ? (
                <View style={styles.buttons}>
                  {options.action ? (
                    <ToastButton
                      button={options.action}
                      onPress={() => dismissFromToast(id, 'action')}
                    />
                  ) : null}
                  {options.cancel ? (
                    <ToastButton
                      button={options.cancel}
                      onPress={() => dismissFromToast(id, 'cancel')}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
            {options.closeButton && dismissible ? (
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => dismissFromToast(id, 'dismiss')}
              >
                <Glyph
                  name="close"
                  size={20}
                  color={options.closeButtonColor}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ToastColumn({
  position,
  toasts,
}: {
  position: ToastPosition;
  toasts: StoreToast[];
}) {
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [expanded, setExpanded] = useState(false);
  const active = useMemo(
    () => toasts.filter((toast) => !toast.dismissing).reverse(),
    [toasts]
  );
  const settings = (active[0] ?? toasts[toasts.length - 1]!).options;
  const stacking = settings.enableStacking && !expanded;
  const frontHeight = active[0] ? (heights[active[0].key] ?? 0) : 0;
  const layout = computeLayout(
    active.map((toast) => ({
      id: String(toast.key),
      height: heights[toast.key] ?? 0,
    })),
    { enableStacking: stacking, gap: settings.gap }
  );

  const reportHeight = useCallback((key: number, height: number) => {
    setHeights((current) =>
      current[key] === height ? current : { ...current, [key]: height }
    );
  }, []);

  useEffect(() => {
    setHeights((current) => {
      const stale = Object.keys(current).filter(
        (key) => !toasts.some((toast) => String(toast.key) === key)
      );
      if (stale.length === 0) return current;
      const next = { ...current };
      stale.forEach((key) => delete next[Number(key)]);
      return next;
    });
  }, [toasts]);

  useEffect(() => {
    if (
      !settings.enableStacking ||
      !settings.expandOnPress ||
      active.length <= 1
    ) {
      setExpanded(false);
    }
  }, [active.length, settings.enableStacking, settings.expandOnPress]);

  const edge = settings.offset ?? DEFAULT_OFFSET;
  const anchor: ViewStyle =
    position === 'top-center'
      ? { top: edge }
      : position === 'bottom-center'
        ? { bottom: edge }
        : { top: '50%' };

  return (
    <View pointerEvents="box-none" style={[styles.column, anchor]}>
      {toasts.map((toast) => {
        const target = layout[String(toast.key)];
        const translateY =
          target === undefined
            ? undefined
            : position === 'bottom-center'
              ? -target.distance
              : position === 'center'
                ? target.distance - frontHeight / 2
                : target.distance;

        return (
          <ToastCard
            key={toast.key}
            toast={toast}
            position={position}
            translateY={translateY}
            scale={target?.scale ?? 1}
            depth={target?.depth ?? 0}
            stacked={stacking}
            hasSiblings={active.some((other) => other !== toast)}
            onCardPress={() => {
              if (settings.expandOnPress && stacking && active.length > 1) {
                setExpanded(true);
              } else {
                press(toast.options.id);
              }
            }}
            reportHeight={reportHeight}
          />
        );
      })}
    </View>
  );
}

export function ToastHost(props: ToastHostProps) {
  setToastHostConfig(props);
  const { toasts } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (toasts.length === 0) return null;

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View pointerEvents="box-none" style={styles.overlay}>
          {POSITIONS.map((position) => {
            const group = toasts.filter(
              (toast) => toast.options.position === position
            );
            return group.length > 0 ? (
              <ToastColumn key={position} position={position} toasts={group} />
            ) : null;
          })}
        </View>
      </SafeAreaView>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  column: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  frame: {
    width: '100%',
    maxWidth: 500,
  },
  card: {
    borderCurve: 'continuous',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.106,
    shadowRadius: 12,
  },
  content: {
    flexDirection: 'row',
    columnGap: 16,
  },
  contentCentered: {
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
  },
  texts: {
    flex: 1,
  },
  description: {
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
    marginTop: 16,
  },
  button: {
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.7,
  },
});
