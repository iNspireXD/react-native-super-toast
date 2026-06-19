import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  Animated,
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
};

function ToastIcon({ toast }: { toast: ResolvedToast }) {
  const icon = toast.icon;
  if (!icon) return null;

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

function ToastCard({ toast, dismissing }: ToastCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const restorePosition = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
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
    const offset = toast.position === 'bottom' ? 12 : -12;

    opacity.setValue(toast.animation === 'none' ? 1 : 0);
    translateY.setValue(toast.animation === 'slide' ? offset : 0);
    scale.setValue(toast.animation === 'scale' ? 0.96 : 1);

    if (toast.animation !== 'none') {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: toast.animation === 'fade' ? 140 : 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (toast.haptic) triggerHaptic();
  }, [opacity, scale, toast, translateY]);

  useEffect(() => {
    if (!dismissing) return;

    if (toast.animation === 'none') {
      completeDismiss(toast.id);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue:
          toast.animation === 'slide'
            ? toast.position === 'bottom'
              ? 12
              : -12
            : 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => completeDismiss(toast.id));
  }, [
    dismissing,
    opacity,
    toast.animation,
    toast.id,
    toast.position,
    translateY,
  ]);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const timeout = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timeout);
  }, [toast.duration, toast.id]);

  const label = [toast.title, toast.message].filter(Boolean).join('. ');

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.toastShell,
        toast.widthMode === 'screen'
          ? styles.screenWidth
          : { maxWidth: toast.maxWidth },
        {
          opacity,
          transform: [{ translateY }, { scale }],
          shadowOpacity: toast.shadowOpacity,
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
  const { current, dismissing } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  const positionStyle = useMemo<ViewStyle>(() => {
    if (!current) return {};

    return {
      justifyContent:
        current.position === 'bottom'
          ? 'flex-end'
          : current.position === 'center'
            ? 'center'
            : 'flex-start',
      paddingHorizontal: current.horizontalMargin,
      paddingTop: current.position === 'top' ? current.topOffset : 0,
      paddingBottom: current.position === 'bottom' ? current.bottomOffset : 0,
    };
  }, [current]);

  if (!current) return null;

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View
          pointerEvents="box-none"
          style={[styles.positionLayer, positionStyle]}
        >
          <ToastCard key={current.id} toast={current} dismissing={dismissing} />
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
