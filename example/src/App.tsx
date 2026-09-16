import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ElementRef, ReactNode } from 'react';
import {
  Modal,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { toast, ToastHost } from 'react-native-super-toast';
import type {
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

const POSITIONS: ToastPosition[] = ['top-center', 'bottom-center', 'center'];
const THEMES: ToastTheme[] = ['system', 'light', 'dark'];
const SWIPE_DIRECTIONS: ToastSwipeDirection[] = ['up', 'down', 'left', 'right'];
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

// Image icons are not themed natively, so tint them to match the toast theme.
const IconColorContext = createContext<string>(COLORS.ink);

function useShopToasts(iconColor: string) {
  const lastId = useRef<ToastId | null>(null);
  const bellIcon = useMemo(
    () =>
      FontAwesomeFreeSolid.getImageSourceSync('bell', {
        size: 20,
        color: iconColor,
      }),
    [iconColor]
  );

  const remember = (id: ToastId) => {
    lastId.current = id;
    return id;
  };

  return {
    copiedCode: () => remember(toast('Discount code copied')),
    refreshOrders: () =>
      remember(toast.loading('Refreshing your orders…', { duration: 2500 })),
    addressSaved: () =>
      remember(
        toast.success('Delivery address updated', {
          description: '42 Willow Street, Portland',
        })
      ),
    preferencesSaved: () =>
      remember(
        toast.success('Preferences saved', {
          description: 'We’ll only send important order updates.',
        })
      ),
    paymentError: () =>
      remember(
        toast.error('Payment couldn’t be completed', {
          description: 'Check your card details and try again.',
          haptic: true,
        })
      ),
    lowStock: () =>
      remember(
        toast.warning('Only 2 left in your size', {
          description: 'Add it to your bag before it’s gone.',
        })
      ),
    freeDelivery: () =>
      remember(
        toast.info('Free delivery unlocked', {
          description: 'Your order qualifies for free standard shipping.',
          closeButton: true,
        })
      ),
    removeItem: () =>
      remember(
        toast('Everyday Tee removed', {
          action: {
            label: 'Undo',
            onClick: () => toast.success('Everyday Tee is back in your bag'),
          },
        })
      ),
    clearBag: () =>
      remember(
        toast('Clear your bag?', {
          description: 'This will remove all 3 items.',
          duration: Infinity,
          action: {
            label: 'Clear',
            onClick: () => toast.success('Your bag is now empty'),
          },
          cancel: {
            label: 'Keep items',
            onClick: () => toast.info('Your bag is unchanged'),
          },
        })
      ),
    placeOrder: (shouldFail: boolean) =>
      remember(
        toast.promise(
          wait(2000).then(() => {
            if (shouldFail) throw new Error('Your card was declined');
            return '#NS-2048';
          }),
          {
            loading: 'Placing your order…',
            success: (orderNumber) => `Order ${orderNumber} confirmed`,
            error: (reason) => (reason as Error).message,
          }
        )
      ),
    trackOrder: () =>
      remember(
        toast('Your order is on the way', {
          description: 'Arriving tomorrow between 2–4 PM.',
          icon: { type: 'image', source: bellIcon, size: 20 },
        })
      ),
    addToBag: () =>
      remember(
        toast.success('Added to your bag', {
          description: 'Everyday Tee · Black · Medium',
          icon: {
            type: 'image',
            source: require('../assets/shopping-cart.png'),
            size: 20,
            tintColor: iconColor,
          },
        })
      ),
    welcomeOffer: () =>
      remember(
        toast.success('Welcome back, Maya', {
          description: 'You have 450 points ready to spend.',
          style: { backgroundColor: COLORS.ink, borderRadius: 10 },
          styles: {
            title: { color: COLORS.white, fontFamily: 'Karla-Bold' },
            description: { color: '#C8C8C3', fontFamily: 'Karla-Italic' },
            icon: { color: '#7EE2A8' },
          },
        })
      ),
    wiggle: () => {
      if (lastId.current !== null) toast.wiggle(lastId.current);
      else remember(toast.info('Your notifications will appear here'));
    },
  };
}

function BagSummary({ onCheckout }: { onCheckout: () => void }) {
  return (
    <View style={styles.bagSummary}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal · 3 items</Text>
        <Text style={styles.summaryValue}>$128.00</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Delivery</Text>
        <Text style={styles.freeLabel}>FREE</Text>
      </View>
      <ActionButton onPress={onCheckout} tone="dark">
        Checkout · $128.00
      </ActionButton>
    </View>
  );
}

export default function App() {
  const [position, setPosition] = useState<ToastPosition>('top-center');
  const [theme, setTheme] = useState<ToastTheme>('system');
  const [swipeDirection, setSwipeDirection] =
    useState<ToastSwipeDirection>('up');
  const [richColors, setRichColors] = useState(false);
  const [closeButton, setCloseButton] = useState(false);
  const [enableStacking, setEnableStacking] = useState(false);
  const [expandOnPress, setExpandOnPress] = useState(false);
  const systemScheme = useColorScheme();
  const darkToasts =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');
  const iconColor = darkToasts ? COLORS.white : COLORS.ink;

  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const regularSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const parentModalRef = useRef<BottomSheetModal>(null);
  const nestedModalRef = useRef<BottomSheetModal>(null);
  const thirdModalRef = useRef<BottomSheetModal>(null);

  const shopToasts = useShopToasts(iconColor);

  const showBurst = useCallback(() => {
    [
      'Order confirmed',
      'Payment receipt emailed',
      '450 reward points earned',
    ].forEach((title, index) => setTimeout(() => toast(title), index * 350));
  }, []);

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
    <IconColorContext.Provider value={iconColor}>
      <SafeAreaProvider style={styles.root}>
        <GestureHandlerRootView style={styles.root}>
          <StatusBar barStyle="dark-content" />
          <BottomSheetModalProvider>
            <SafeAreaView style={styles.root}>
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <PageHeader
                  title="Northstar Supply"
                  subtitle="Everyday goods, thoughtfully made."
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View member rewards"
                  onPress={shopToasts.welcomeOffer}
                  style={({ pressed }) => [
                    styles.hero,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View style={styles.heroCopy}>
                    <Text style={styles.eyebrow}>MEMBER WEEKEND</Text>
                    <Text style={styles.heroTitle}>
                      20% off your everyday edit
                    </Text>
                    <Text style={styles.heroLink}>Explore your rewards →</Text>
                  </View>
                  <Text style={styles.heroMark}>N</Text>
                </Pressable>

                <Section title="FOR YOU">
                  <View style={styles.productCard}>
                    <View style={styles.productVisual}>
                      <Text style={styles.productEmoji}>👕</Text>
                      <View style={styles.favoriteBadge}>
                        <Text style={styles.favoriteText}>♡</Text>
                      </View>
                    </View>
                    <View style={styles.productDetails}>
                      <View style={styles.productHeading}>
                        <View style={styles.productNameWrap}>
                          <Text style={styles.productName}>Everyday Tee</Text>
                          <Text style={styles.productMeta}>Black · Medium</Text>
                        </View>
                        <Text style={styles.productPrice}>$38</Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Add Everyday Tee to bag"
                        onPress={shopToasts.addToBag}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Image
                          source={require('../assets/shopping-cart.png')}
                          style={styles.cartIcon}
                        />
                        <Text style={styles.primaryButtonText}>Add to bag</Text>
                      </Pressable>
                    </View>
                  </View>
                </Section>

                <Section title="YOUR ORDER">
                  <View style={styles.orderCard}>
                    <View style={styles.orderTopRow}>
                      <View>
                        <Text style={styles.orderStatus}>OUT FOR DELIVERY</Text>
                        <Text style={styles.orderTitle}>Arriving tomorrow</Text>
                      </View>
                      <Text style={styles.orderNumber}>#NS-1934</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={styles.progressFill} />
                    </View>
                    <View style={styles.inlineActions}>
                      <Pressable onPress={shopToasts.trackOrder}>
                        <Text style={styles.textAction}>Track package</Text>
                      </Pressable>
                      <Pressable onPress={shopToasts.refreshOrders}>
                        <Text style={styles.textAction}>Refresh</Text>
                      </Pressable>
                    </View>
                  </View>
                </Section>

                <Section title="QUICK ACTIONS">
                  <ActionButton onPress={shopToasts.copiedCode}>
                    Copy code WEEKEND20
                  </ActionButton>
                  <ActionButton onPress={shopToasts.freeDelivery}>
                    Check delivery offer
                  </ActionButton>
                  <ActionButton onPress={shopToasts.lowStock}>
                    Check size availability
                  </ActionButton>
                  <ActionButton onPress={shopToasts.paymentError}>
                    Retry last payment
                  </ActionButton>
                  <ActionButton onPress={showBurst}>
                    Show notification stack
                  </ActionButton>
                  <ActionButton onPress={shopToasts.wiggle}>
                    Wiggle latest notification
                  </ActionButton>
                </Section>

                <Section title="ACCOUNT">
                  <ActionButton onPress={() => setPageSheetModalVisible(true)}>
                    Delivery & notifications
                  </ActionButton>
                  <ActionButton
                    onPress={() => setTransparentModalVisible(true)}
                  >
                    Manage saved payment
                  </ActionButton>
                  <ActionButton
                    onPress={() => regularSheetRef.current?.snapToIndex(0)}
                  >
                    View your bag
                  </ActionButton>
                  <ActionButton
                    onPress={() => parentModalRef.current?.present()}
                  >
                    Start checkout
                  </ActionButton>
                </Section>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss all toasts"
                  onPress={() => toast.dismiss()}
                  style={({ pressed }) => [
                    styles.dismissAll,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.dismissAllText}>Clear notifications</Text>
                  <Text style={styles.dismissAllIcon}>×</Text>
                </Pressable>
              </ScrollView>

              <DraggableSettingsButton
                onPress={() => settingsSheetRef.current?.present()}
              />

              <BottomSheetModal
                ref={settingsSheetRef}
                index={0}
                snapPoints={['72%']}
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
                  <SettingChoice
                    label="Position"
                    values={POSITIONS}
                    value={position}
                    onChange={setPosition}
                  />
                  <SettingChoice
                    label="Theme"
                    values={THEMES}
                    value={theme}
                    onChange={setTheme}
                  />
                  <SettingChoice
                    label="Swipe direction"
                    values={SWIPE_DIRECTIONS}
                    value={swipeDirection}
                    onChange={setSwipeDirection}
                  />
                  <SettingToggle
                    label="Rich colors"
                    value={richColors}
                    onChange={setRichColors}
                  />
                  <SettingToggle
                    label="Close button"
                    value={closeButton}
                    onChange={setCloseButton}
                  />
                  <SettingToggle
                    label="Stacking"
                    value={enableStacking}
                    onChange={setEnableStacking}
                  />
                  <SettingToggle
                    label="Expand stack on press"
                    value={expandOnPress}
                    onChange={setExpandOnPress}
                  />
                </BottomSheetScrollView>
              </BottomSheetModal>

              <Modal
                visible={pageSheetModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPageSheetModalVisible(false)}
              >
                <GestureHandlerRootView style={styles.modalRoot}>
                  <SafeAreaProvider style={styles.modalRoot}>
                    <SafeAreaView style={styles.modalRoot}>
                      <ScrollView contentContainerStyle={styles.content}>
                        <PageHeader
                          title="Your preferences"
                          subtitle="Keep delivery details and updates current."
                        />
                        <Section title="DELIVERY">
                          <ActionButton onPress={shopToasts.addressSaved}>
                            Save home address
                          </ActionButton>
                          <ActionButton onPress={shopToasts.freeDelivery}>
                            Check delivery benefits
                          </ActionButton>
                        </Section>
                        <Section title="NOTIFICATIONS">
                          <ActionButton onPress={shopToasts.preferencesSaved}>
                            Save notification preferences
                          </ActionButton>
                        </Section>
                        <ActionButton
                          onPress={() => setPageSheetModalVisible(false)}
                          tone="dark"
                        >
                          Done
                        </ActionButton>
                      </ScrollView>
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
                      title="Saved card"
                      subtitle="Visa ending in 4242 · Expires 08/28"
                    />
                    <View style={styles.actionList}>
                      <ActionButton onPress={shopToasts.preferencesSaved}>
                        Make default
                      </ActionButton>
                      <ActionButton onPress={shopToasts.paymentError}>
                        Verify card
                      </ActionButton>
                      <ActionButton onPress={shopToasts.clearBag}>
                        Remove saved card
                      </ActionButton>
                      <ActionButton
                        onPress={() => setTransparentModalVisible(false)}
                        tone="dark"
                      >
                        Close modal
                      </ActionButton>
                    </View>
                  </View>
                </GestureHandlerRootView>
              </Modal>

              {/* A closed Android backdrop can intercept touches after RN Modals close. */}
              <BottomSheet
                ref={regularSheetRef}
                index={-1}
                enablePanDownToClose
                backdropComponent={
                  Platform.OS === 'android' ? undefined : renderBackdrop
                }
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
              >
                <BottomSheetScrollView
                  contentContainerStyle={styles.sheetContent}
                >
                  <PageHeader
                    title="Your bag"
                    subtitle="3 items reserved for the next 20 minutes."
                  />
                  <BagSummary
                    onCheckout={() => parentModalRef.current?.present()}
                  />
                  <Section title="BAG OPTIONS">
                    <ActionButton onPress={shopToasts.removeItem}>
                      Remove Everyday Tee
                    </ActionButton>
                    <ActionButton onPress={shopToasts.clearBag}>
                      Clear bag
                    </ActionButton>
                  </Section>
                  <ActionButton
                    onPress={() => regularSheetRef.current?.close()}
                    tone="dark"
                  >
                    Continue shopping
                  </ActionButton>
                </BottomSheetScrollView>
              </BottomSheet>

              <BottomSheetModal
                ref={parentModalRef}
                stackBehavior="push"
                index={0}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
              >
                <BottomSheetScrollView
                  contentContainerStyle={styles.sheetContent}
                >
                  <PageHeader
                    title="Checkout"
                    subtitle="Express checkout · $128.00"
                  />
                  <BagSummary onCheckout={() => shopToasts.placeOrder(false)} />
                  <Section title="CHECKOUT DETAILS">
                    <ActionButton
                      onPress={() => nestedModalRef.current?.present()}
                    >
                      Standard delivery · Free
                    </ActionButton>
                    <ActionButton onPress={() => shopToasts.placeOrder(true)}>
                      Test declined payment
                    </ActionButton>
                    <ActionButton onPress={showBurst}>
                      Complete order with updates
                    </ActionButton>
                  </Section>
                  <ActionButton
                    onPress={() => parentModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Return to bag
                  </ActionButton>
                </BottomSheetScrollView>
              </BottomSheetModal>

              <BottomSheetModal
                ref={nestedModalRef}
                stackBehavior="push"
                index={0}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
              >
                <BottomSheetScrollView
                  contentContainerStyle={styles.sheetContent}
                >
                  <PageHeader
                    title="Delivery method"
                    subtitle="Choose how you’d like to receive your order."
                  />
                  <Section title="OPTIONS">
                    <ActionButton onPress={shopToasts.addressSaved}>
                      Standard · Free · 3–5 days
                    </ActionButton>
                    <ActionButton onPress={shopToasts.lowStock}>
                      Express · $12 · Tomorrow
                    </ActionButton>
                    <ActionButton
                      onPress={() => thirdModalRef.current?.present()}
                    >
                      Add delivery instructions
                    </ActionButton>
                  </Section>
                  <ActionButton
                    onPress={() => nestedModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Back to checkout
                  </ActionButton>
                </BottomSheetScrollView>
              </BottomSheetModal>

              <BottomSheetModal
                ref={thirdModalRef}
                stackBehavior="push"
                index={0}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.sheetHandle}
              >
                <BottomSheetScrollView
                  contentContainerStyle={styles.sheetContent}
                >
                  <PageHeader
                    title="Delivery instructions"
                    subtitle="Help the courier find a safe place."
                  />
                  <Section title="SAVED INSTRUCTIONS">
                    <ActionButton onPress={shopToasts.addressSaved}>
                      Leave with reception
                    </ActionButton>
                    <ActionButton onPress={shopToasts.preferencesSaved}>
                      Ring the doorbell
                    </ActionButton>
                  </Section>
                  <ActionButton
                    onPress={() => thirdModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Save and close
                  </ActionButton>
                </BottomSheetScrollView>
              </BottomSheetModal>

              <ToastHost
                position={position}
                theme={theme}
                richColors={richColors}
                closeButton={closeButton}
                enableStacking={enableStacking}
                expandOnPress={expandOnPress}
                swipeToDismissDirection={swipeDirection}
              />
            </SafeAreaView>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </IconColorContext.Provider>
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
  hero: {
    minHeight: 178,
    borderRadius: 18,
    padding: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: { flex: 1, gap: 9, zIndex: 1 },
  eyebrow: {
    color: '#9FE2B0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    maxWidth: 220,
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 31,
    letterSpacing: -0.6,
  },
  heroLink: { color: '#D7D7D2', fontSize: 13, fontWeight: '600' },
  heroMark: {
    position: 'absolute',
    right: -10,
    bottom: -44,
    color: '#2B2B2B',
    fontSize: 184,
    fontWeight: '800',
    lineHeight: 200,
  },
  section: { gap: 10 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionList: { gap: 7 },
  productCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
  },
  productVisual: {
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9E4DD',
  },
  productEmoji: { fontSize: 76 },
  favoriteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  favoriteText: { color: COLORS.ink, fontSize: 22, lineHeight: 25 },
  productDetails: { padding: 16, gap: 16 },
  productHeading: { flexDirection: 'row', gap: 12 },
  productNameWrap: { flex: 1, gap: 3 },
  productName: { color: COLORS.ink, fontSize: 17, fontWeight: '700' },
  productMeta: { color: COLORS.muted, fontSize: 13 },
  productPrice: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  cartIcon: { width: 21, height: 21, tintColor: COLORS.white },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    padding: 16,
    gap: 16,
  },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderStatus: {
    color: '#248144',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  orderTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  orderNumber: { color: COLORS.muted, fontSize: 12 },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: COLORS.soft,
  },
  progressFill: {
    width: '78%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#35A85A',
  },
  inlineActions: { flexDirection: 'row', gap: 24 },
  textAction: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  bagSummary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    padding: 16,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { color: COLORS.muted, fontSize: 14 },
  summaryValue: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  freeLabel: { color: '#248144', fontSize: 12, fontWeight: '800' },
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
  dismissAll: {
    minHeight: 49,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissAllText: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissAllIcon: { color: COLORS.muted, fontSize: 21 },
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
