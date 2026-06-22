import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import {
  completeDismiss,
  dismiss,
  getSnapshot,
  subscribe,
  triggerHaptic,
} from './iosToastStore';
import type { ResolvedToast } from './iosToastStore';

type ToastCardProps = {
  toast: ResolvedToast;
  dismissing: boolean;
  stackDepth?: number;
  stacked?: boolean;
};

type ToastViewHandle = {
  measureInWindow(
    callback: (x: number, y: number, width: number, height: number) => void
  ): void;
};

const enterEasing = Easing.bezier(0.16, 1, 0.3, 1);
const exitEasing = Easing.bezier(0.4, 0, 1, 1);

function LoadingSpinner({ color }: { color: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [rotation]);

  return (
    <Animated.View
      style={[
        styles.spinner,
        {
          borderColor: color,
          transform: [
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
        styles.spinnerCutout,
      ]}
    />
  );
}

function ToastIcon({ toast }: { toast: ResolvedToast }) {
  const icon = toast.icon;
  if (!icon) {
    if (toast.kind === 'loading') {
      return <LoadingSpinner color={toast.iconColor} />;
    }

    const stateGlyph =
      toast.kind === 'success'
        ? '✓'
        : toast.kind === 'error'
          ? '!'
          : toast.kind === 'warning'
            ? '!'
            : toast.kind === 'info'
              ? 'i'
              : null;

    return stateGlyph ? (
      <Text style={[styles.stateIcon, { color: toast.iconColor }]}>
        {stateGlyph}
      </Text>
    ) : null;
  }

  if (icon.type === 'image' && icon.uri) {
    const size = icon.size ?? 24;
    return (
      <Image
        source={{ uri: icon.uri }}
        resizeMode="contain"
        style={[
          styles.imageIcon,
          {
            width: icon.width ?? size,
            height: icon.height ?? size,
            borderRadius: icon.cornerRadius ?? 0,
            tintColor: icon.tintColor,
          },
        ]}
      />
    );
  }

  const value = icon.type === 'font' ? icon.glyph : icon.value;
  if (!value) return null;

  return (
    <Text
      style={{
        color: icon.color ?? toast.iconColor,
        fontFamily: icon.type === 'font' ? icon.fontFamily : undefined,
        fontSize: icon.size ?? 22,
        lineHeight: icon.size ?? 22,
      }}
    >
      {value}
    </Text>
  );
}

function ToastCard({
  toast,
  dismissing,
  stackDepth = 0,
  stacked = false,
}: ToastCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const stackTranslateY = useRef(
    new Animated.Value(stackDepth * toast.stackOffset)
  ).current;
  const stackScale = useRef(
    new Animated.Value(Math.max(0.9, 1 - stackDepth * 0.035))
  ).current;
  const stackOpacity = useRef(
    new Animated.Value(Math.max(0.55, 1 - stackDepth * 0.2))
  ).current;
  const initialToast = useRef(toast).current;
  const toastRef = useRef<ToastViewHandle>(null);
  const entranceStarted = useRef(false);
  const slideOffset = useRef(initialToast.position === 'bottom' ? 12 : -12);

  const runEntranceAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: initialToast.enterDuration,
        easing: enterEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: initialToast.enterDuration,
        easing: enterEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [initialToast.enterDuration, opacity, translateY]);

  const startSlideEntrance = useCallback(() => {
    if (
      entranceStarted.current ||
      initialToast.animation !== 'slide' ||
      initialToast.position === 'center'
    ) {
      return;
    }

    toastRef.current?.measureInWindow((_x, y, _width, height) => {
      if (entranceStarted.current) return;

      entranceStarted.current = true;
      slideOffset.current =
        initialToast.position === 'bottom'
          ? Dimensions.get('window').height - y + 8
          : -(y + height + 8);
      translateY.setValue(slideOffset.current);

      requestAnimationFrame(runEntranceAnimation);
    });
  }, [initialToast, runEntranceAnimation, translateY]);

  const restorePosition = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 160,
        easing: enterEasing,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        easing: enterEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          toast.swipeToDismiss &&
          Math.abs(gesture.dy) > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          const distance =
            toast.position === 'bottom'
              ? Math.max(0, gesture.dy)
              : Math.min(0, gesture.dy);
          translateY.setValue(distance);
          opacity.setValue(Math.max(0.35, 1 - Math.abs(distance) / 96));
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dy) > 40) {
            dismiss(toast.id);
          } else {
            restorePosition();
          }
        },
        onPanResponderTerminate: restorePosition,
      }),
    [
      opacity,
      restorePosition,
      toast.id,
      toast.position,
      toast.swipeToDismiss,
      translateY,
    ]
  );

  useEffect(() => {
    const offset = initialToast.position === 'bottom' ? 12 : -12;

    opacity.setValue(initialToast.animation === 'none' ? 1 : 0);
    translateY.setValue(initialToast.animation === 'slide' ? offset : 0);
    scale.setValue(initialToast.animation === 'scale' ? 0.96 : 1);

    if (
      initialToast.animation !== 'none' &&
      !(
        initialToast.animation === 'slide' && initialToast.position !== 'center'
      )
    ) {
      entranceStarted.current = true;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: initialToast.enterDuration,
          easing: enterEasing,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: initialToast.enterDuration,
          easing: enterEasing,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: initialToast.enterDuration,
          easing: enterEasing,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [initialToast, opacity, scale, translateY]);

  useEffect(() => {
    if (toast.haptic) triggerHaptic();
  }, [toast.haptic, toast.kind, toast.revision]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stackTranslateY, {
        toValue: stackDepth * toast.stackOffset,
        duration: toast.enterDuration,
        easing: enterEasing,
        useNativeDriver: true,
      }),
      Animated.timing(stackScale, {
        toValue: Math.max(0.9, 1 - stackDepth * 0.035),
        duration: toast.enterDuration,
        easing: enterEasing,
        useNativeDriver: true,
      }),
      Animated.timing(stackOpacity, {
        toValue: Math.max(0.55, 1 - stackDepth * 0.2),
        duration: toast.enterDuration,
        easing: enterEasing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    stackDepth,
    stackOpacity,
    stackScale,
    stackTranslateY,
    toast.enterDuration,
    toast.stackOffset,
  ]);

  useEffect(() => {
    if (!dismissing) return;

    if (toast.animation === 'none') {
      completeDismiss(toast.id);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: toast.exitDuration,
        easing: exitEasing,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue:
          toast.animation === 'slide'
            ? toast.position === 'center'
              ? -12
              : slideOffset.current
            : 0,
        duration: toast.exitDuration,
        easing: exitEasing,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: toast.animation === 'scale' ? 0.96 : 1,
        duration: toast.exitDuration,
        easing: exitEasing,
        useNativeDriver: true,
      }),
    ]).start(() => completeDismiss(toast.id));
  }, [
    dismissing,
    opacity,
    toast.animation,
    toast.exitDuration,
    toast.id,
    toast.position,
    translateY,
    scale,
  ]);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const timeout = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timeout);
  }, [toast.duration, toast.id, toast.revision]);

  const label = [toast.title, toast.message].filter(Boolean).join('. ');

  return (
    <Animated.View
      ref={(node) => {
        toastRef.current = node;
      }}
      onLayout={startSlideEntrance}
      {...panResponder.panHandlers}
      pointerEvents={stacked && stackDepth > 0 ? 'none' : 'auto'}
      style={[
        styles.toastShell,
        stacked && styles.stackedToast,
        stacked &&
          (toast.position === 'bottom'
            ? styles.stackedToastBottom
            : styles.stackedToastTop),
        stacked && toast.widthMode === 'screen' && styles.stackedScreenWidth,
        toast.widthMode === 'screen'
          ? styles.screenWidth
          : { maxWidth: toast.maxWidth },
        {
          opacity: Animated.multiply(opacity, stackOpacity),
          transform: [
            { translateY: stackTranslateY },
            { translateY },
            { scale: stackScale },
            { scale },
          ],
          shadowOpacity: toast.shadowOpacity,
          zIndex: 100 - stackDepth,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="alert"
        disabled={!toast.closeOnPress}
        onPress={() => dismiss(toast.id)}
        style={[
          styles.toast,
          {
            backgroundColor: toast.backgroundColor,
            borderColor: toast.borderColor,
            borderRadius: toast.borderRadius,
            borderWidth: toast.borderWidth,
            paddingHorizontal: toast.paddingHorizontal,
            paddingVertical: toast.paddingVertical,
          },
        ]}
      >
        <View style={[styles.row, { columnGap: toast.gap }]}>
          <ToastIcon toast={toast} />

          <View style={styles.texts}>
            {toast.title ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.title,
                  { color: toast.titleColor, fontSize: toast.titleSize },
                ]}
              >
                {toast.title}
              </Text>
            ) : null}

            {toast.message ? (
              <Text
                numberOfLines={4}
                style={[
                  styles.message,
                  {
                    color: toast.messageColor,
                    fontSize: toast.messageSize,
                  },
                ]}
              >
                {toast.message}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SuperToastHost() {
  const { current, dismissing, stacked, stackedDismissingIds } =
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const frontToast = current ?? stacked.at(-1) ?? null;

  const positionStyle = useMemo<ViewStyle>(() => {
    if (!frontToast) return {};

    return {
      justifyContent:
        frontToast.position === 'bottom'
          ? 'flex-end'
          : frontToast.position === 'center'
            ? 'center'
            : 'flex-start',
      paddingHorizontal: frontToast.horizontalMargin,
      paddingTop: frontToast.position === 'top' ? frontToast.topOffset : 0,
      paddingBottom:
        frontToast.position === 'bottom' ? frontToast.bottomOffset : 0,
    };
  }, [frontToast]);

  if (!frontToast) return null;

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View
          pointerEvents="box-none"
          style={[styles.positionLayer, positionStyle]}
        >
          {stacked.length > 0 ? (
            <View pointerEvents="box-none" style={styles.stackStage}>
              {stacked.map((toast, index) => (
                <ToastCard
                  key={toast.id}
                  toast={toast}
                  dismissing={stackedDismissingIds.includes(toast.id)}
                  stackDepth={stacked.length - index - 1}
                  stacked
                />
              ))}
            </View>
          ) : current ? (
            <ToastCard
              key={current.id}
              toast={current}
              dismissing={dismissing}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  positionLayer: {
    flex: 1,
    alignItems: 'center',
  },
  toastShell: {
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  stackedToast: {
    position: 'absolute',
  },
  stackedToastTop: {
    top: 0,
  },
  stackedToastBottom: {
    bottom: 0,
  },
  stackedScreenWidth: {
    width: '100%',
  },
  stackStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  screenWidth: {
    alignSelf: 'stretch',
  },
  toast: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageIcon: {
    flexGrow: 0,
    flexShrink: 0,
  },
  spinner: {
    width: 22,
    height: 22,
    borderWidth: 2.5,
    borderRadius: 11,
  },
  spinnerCutout: {
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  stateIcon: {
    width: 22,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  texts: {
    flexShrink: 1,
  },
  title: {
    fontWeight: '700',
  },
  message: {
    marginTop: 2,
  },
});
