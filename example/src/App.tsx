import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ElementRef, ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import SuperToast, { SuperToastHost } from 'react-native-super-toast';
import type { ToastKind, ToastOptions } from 'react-native-super-toast';
import { FontAwesomeFreeSolid } from '@react-native-vector-icons/fontawesome-free-solid';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const COLORS = {
  ink: '#111111',
  paper: '#FAFAF8',
  white: '#FFFFFF',
  muted: '#686868',
  line: '#DEDEDA',
  soft: '#F0F0EC',
  inverseMuted: '#C8C8C3',
} as const;

const TOAST_COLORS: Record<ToastKind, string> = {
  default: '#171717',
  success: '#18794E',
  error: '#B42318',
  warning: '#A15C00',
  info: '#2457A7',
  loading: '#3F3F46',
};

function getToastStyle(
  kind: ToastKind
): Pick<
  ToastOptions,
  | 'backgroundColor'
  | 'titleColor'
  | 'messageColor'
  | 'iconColor'
  | 'borderColor'
  | 'borderWidth'
  | 'titleFontFamily'
  | 'messageFontFamily'
> {
  return {
    backgroundColor: TOAST_COLORS[kind],
    titleColor: COLORS.white,
    messageColor: '#F1F1ED',
    iconColor: COLORS.white,
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    titleFontFamily: 'Karla-Bold',
    messageFontFamily: 'Karla-Italic',
  };
}

function ActionButton({
  children,
  onPress,
  tone = 'light',
}: {
  children: ReactNode;
  onPress: () => void;
  tone?: 'light' | 'dark' | 'quiet';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'dark' && styles.buttonDark,
        tone === 'quiet' && styles.buttonQuiet,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[styles.buttonLabel, tone === 'dark' && styles.buttonLabelDark]}
      >
        {children}
      </Text>
      <Text
        style={[styles.buttonArrow, tone === 'dark' && styles.buttonLabelDark]}
      >
        ↗
      </Text>
    </Pressable>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.eyebrow}>{index}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.actionList}>{children}</View>
    </View>
  );
}

function PageIntro({
  label,
  title,
  copy,
}: {
  label: string;
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.intro}>
      <View style={styles.wordmarkRow}>
        <View style={styles.mark}>
          <Text style={styles.markText}>ST</Text>
        </View>
        <Text style={styles.wordmark}>SUPER TOAST</Text>
        <View style={styles.rule} />
        <Text style={styles.version}>DEMO / 01</Text>
      </View>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{copy}</Text>
    </View>
  );
}

function ToastActionsCard({
  source,
  onOpenNested,
  onOpenModalInside,
}: {
  source: string;
  onOpenNested?: () => void;
  onOpenModalInside?: () => void;
}) {
  const loadingToastId = useRef<string | null>(null);

  const showFontIcon = useCallback(() => {
    const sourceIcon = FontAwesomeFreeSolid.getImageSourceSync('bell', {
      size: 22,
      color: COLORS.white,
    });
    SuperToast.show({
      ...getToastStyle('info'),
      title: 'New message',
      message: `A notification from ${source}.`,
      icon: { type: 'image', source: sourceIcon, size: 22 },
    });
  }, [source]);

  const showLoading = () => {
    if (loadingToastId.current) return;
    loadingToastId.current = SuperToast.loading({
      ...getToastStyle('loading'),
      title: 'Uploading',
      message: `Persistent toast from ${source}.`,
      duration: 0,
      closeOnPress: false,
      swipeToDismiss: false,
    });
  };

  const dismissLoading = () => {
    if (!loadingToastId.current) return;
    SuperToast.dismiss(loadingToastId.current);
    loadingToastId.current = null;
    SuperToast.success({
      ...getToastStyle('success'),
      title: 'All done',
      message: 'Loading toast dismissed.',
      icon: '✓',
    });
  };

  return (
    <Section index="TOAST LAB" title={source}>
      <ActionButton
        onPress={() =>
          SuperToast.success({
            ...getToastStyle('success'),
            title: 'Synced',
            message: `Data synced from ${source}.`,
            icon: '✓',
          })
        }
      >
        Text icon
      </ActionButton>
      <ActionButton
        onPress={() =>
          SuperToast.show({
            ...getToastStyle('default'),
            title: 'Added to cart',
            message: 'Super Toast T-Shirt is in your cart.',
            icon: {
              type: 'image',
              source: require('../assets/shopping-cart.png'),
              size: 22,
              tintColor: COLORS.white,
            },
          })
        }
      >
        PNG icon
      </ActionButton>
      <ActionButton onPress={showFontIcon}>Vector icon</ActionButton>
      <ActionButton onPress={showLoading}>Persistent loading</ActionButton>
      <ActionButton onPress={dismissLoading} tone="quiet">
        Dismiss loading
      </ActionButton>
      {onOpenNested ? (
        <ActionButton onPress={onOpenNested} tone="dark">
          Open nested sheet
        </ActionButton>
      ) : null}
      {onOpenModalInside ? (
        <ActionButton onPress={onOpenModalInside} tone="dark">
          Open modal above sheet
        </ActionButton>
      ) : null}
    </Section>
  );
}

export default function App() {
  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const [rnModalOverSheetVisible, setRnModalOverSheetVisible] = useState(false);
  const loadingToastId = useRef<string | null>(null);
  const regularSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const parentModalRef = useRef<BottomSheetModal>(null);
  const nestedModalRef = useRef<BottomSheetModal>(null);
  const thirdModalRef = useRef<BottomSheetModal>(null);
  const regularSheetSnapPoints = useMemo(() => ['45%', '85%'], []);
  const modalSnapPoints = useMemo(() => ['55%', '90%'], []);

  const bellIconSource = useMemo(
    () =>
      FontAwesomeFreeSolid.getImageSourceSync('bell', {
        size: 22,
        color: COLORS.white,
      }),
    []
  );

  useEffect(() => {
    SuperToast.configure({
      ...getToastStyle('default'),
      position: 'top',
      duration: 3000,
      animation: 'slide',
      enterDuration: 420,
      exitDuration: 220,
      widthMode: 'screen',
      topOffset: Platform.OS === 'ios' ? 8 : 54,
      bottomOffset: Platform.OS === 'ios' ? 24 : 64,
      horizontalMargin: 16,
      maxWidth: 360,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 11,
      titleSize: 15,
      messageSize: 13,
      elevation: 6,
      shadowOpacity: 0.16,
      swipeToDismiss: false,
      closeOnPress: true,
      queue: false,
      stack: true,
      stackLimit: 3,
      stackOffset: 9,
      haptic: false,
    });
  }, []);

  const showTextIcon = (source: string) =>
    SuperToast.success({
      ...getToastStyle('success'),
      title: 'Synced',
      message: `Data synced from ${source}.`,
      icon: '✓',
    });
  const showPngIcon = () =>
    SuperToast.show({
      ...getToastStyle('default'),
      title: 'Added to cart',
      message: 'Super Toast T-Shirt is in your cart.',
      icon: {
        type: 'image',
        source: require('../assets/shopping-cart.png'),
        size: 22,
        tintColor: COLORS.white,
      },
    });
  const showFontIcon = (source: string) =>
    SuperToast.show({
      ...getToastStyle('info'),
      title: 'New message',
      message: `A notification from ${source}.`,
      icon: { type: 'image', source: bellIconSource, size: 22 },
    });

  function showLoadingIcon(source: string) {
    if (loadingToastId.current) return;
    loadingToastId.current = SuperToast.loading({
      ...getToastStyle('loading'),
      title: 'Uploading',
      message: `Persistent toast from ${source}.`,
      duration: 0,
      closeOnPress: false,
      swipeToDismiss: false,
    });
  }

  function dismissLoadingIcon() {
    if (!loadingToastId.current) return;
    SuperToast.dismiss(loadingToastId.current);
    loadingToastId.current = null;
    SuperToast.success({
      ...getToastStyle('success'),
      title: 'All done',
      message: 'Loading toast dismissed.',
      icon: '✓',
    });
  }

  async function simulateUpload(shouldFail: boolean) {
    if (loadingToastId.current) return;
    const toastId = SuperToast.loading({
      ...getToastStyle('loading'),
      title: 'Uploading file',
      message: 'Preparing your upload…',
      duration: 0,
      closeOnPress: false,
      swipeToDismiss: false,
    });
    loadingToastId.current = toastId;
    await new Promise((resolve) => setTimeout(resolve, 2200));
    SuperToast.update(toastId, {
      ...getToastStyle(shouldFail ? 'error' : 'success'),
      kind: shouldFail ? 'error' : 'success',
      title: shouldFail ? 'Upload failed' : 'Upload complete',
      message: shouldFail
        ? 'The server rejected the simulated upload.'
        : 'Your file is ready to go.',
      icon: shouldFail ? '×' : '✓',
      duration: 2500,
      closeOnPress: true,
      swipeToDismiss: true,
      haptic: true,
    });
    loadingToastId.current = null;
  }

  function showStackDemo() {
    const variants: ToastKind[] = ['success', 'info', 'warning'];
    [
      'Changes saved.',
      'New message received.',
      'Background sync complete.',
    ].forEach((message, index) => {
      setTimeout(
        () =>
          SuperToast.show({
            ...getToastStyle(variants[index] ?? 'default'),
            kind: variants[index],
            title: `Activity 0${index + 1}`,
            message,
            duration: 3200 + index * 500,
            stack: true,
          }),
        index * 450
      );
    });
  }

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      opacity={0.55}
    />
  );

  const modalIntro = (label: string, title: string, copy: string) => (
    <PageIntro label={label} title={title} copy={copy} />
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        <SafeAreaView style={styles.root}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <PageIntro
              label="A TINY NATIVE NOTIFICATION LAB"
              title={'Toast,\nbut make it crisp.'}
              copy="A monochrome playground for icons, loading states, stacks, modals, and sheets."
            />

            <Section index="01" title="Toast essentials">
              <ActionButton onPress={() => showTextIcon('main screen')}>
                Text icon
              </ActionButton>
              <ActionButton onPress={showPngIcon}>PNG icon</ActionButton>
              <ActionButton onPress={() => showFontIcon('main screen')}>
                Vector icon
              </ActionButton>
              <ActionButton onPress={() => showLoadingIcon('main screen')}>
                Persistent loading
              </ActionButton>
              <ActionButton onPress={dismissLoadingIcon} tone="quiet">
                Dismiss loading
              </ActionButton>
              <ActionButton onPress={() => simulateUpload(false)}>
                Successful upload
              </ActionButton>
              <ActionButton onPress={() => simulateUpload(true)}>
                Failed upload
              </ActionButton>
              <ActionButton onPress={showStackDemo} tone="dark">
                Stack three toasts
              </ActionButton>
            </Section>

            <Section index="02" title="Native modals">
              <ActionButton onPress={() => setPageSheetModalVisible(true)}>
                Open page sheet
              </ActionButton>
              <ActionButton onPress={() => setTransparentModalVisible(true)}>
                Open transparent modal
              </ActionButton>
            </Section>

            <Section index="03" title="Bottom sheets">
              <ActionButton
                onPress={() => regularSheetRef.current?.snapToIndex(0)}
              >
                Open regular sheet
              </ActionButton>
              <ActionButton onPress={() => parentModalRef.current?.present()}>
                Open sheet modal
              </ActionButton>
              <ActionButton onPress={() => setRnModalOverSheetVisible(true)}>
                Sheet inside RN modal
              </ActionButton>
            </Section>

            <Pressable
              onPress={SuperToast.dismissAll}
              style={({ pressed }) => [
                styles.dismissAll,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.dismissAllText}>CLEAR THE STAGE</Text>
              <Text style={styles.dismissAllIcon}>×</Text>
            </Pressable>
            <Text style={styles.footer}>
              NATIVE ON iOS + ANDROID · NO GRADIENTS WERE HARMED
            </Text>
          </ScrollView>

          <Modal
            visible={pageSheetModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setPageSheetModalVisible(false)}
          >
            <SafeAreaView style={styles.modalRoot}>
              <ScrollView contentContainerStyle={styles.content}>
                {modalIntro(
                  'NATIVE LAYER / 01',
                  'Page sheet.',
                  'Toasts remain visible above a standard React Native modal.'
                )}
                <ToastActionsCard
                  source="Page sheet"
                  onOpenNested={() => parentModalRef.current?.present()}
                />
                <ActionButton
                  onPress={() => setPageSheetModalVisible(false)}
                  tone="dark"
                >
                  Close page sheet
                </ActionButton>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          <Modal
            visible={transparentModalVisible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={() => setTransparentModalVisible(false)}
          >
            <View style={styles.transparentBackdrop}>
              <View style={styles.transparentModalCard}>
                <Text style={styles.kicker}>NATIVE LAYER / 02</Text>
                <Text style={styles.overlayTitle}>Transparent modal.</Text>
                <Text style={styles.overlayCopy}>
                  A compact stress test for toast z-order.
                </Text>
                <View style={styles.actionList}>
                  <ActionButton
                    onPress={() => showTextIcon('transparent modal')}
                  >
                    Text icon toast
                  </ActionButton>
                  <ActionButton onPress={showPngIcon}>
                    PNG icon toast
                  </ActionButton>
                  <ActionButton
                    onPress={() => showFontIcon('transparent modal')}
                  >
                    Vector icon toast
                  </ActionButton>
                  <ActionButton
                    onPress={() => showLoadingIcon('transparent modal')}
                  >
                    Persistent loading
                  </ActionButton>
                  <ActionButton onPress={dismissLoadingIcon} tone="quiet">
                    Dismiss loading
                  </ActionButton>
                  <ActionButton
                    onPress={() => setTransparentModalVisible(false)}
                    tone="dark"
                  >
                    Close modal
                  </ActionButton>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={rnModalOverSheetVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setRnModalOverSheetVisible(false)}
          >
            <SafeAreaView style={styles.modalRoot}>
              <ScrollView contentContainerStyle={styles.content}>
                {modalIntro(
                  'COMPOSITE LAYER',
                  'Modal + sheet.',
                  'The toast stays above both native and Gorhom layers.'
                )}
                <ToastActionsCard source="RN modal" />
                <ActionButton
                  onPress={() => regularSheetRef.current?.snapToIndex(0)}
                >
                  Open regular sheet inside
                </ActionButton>
                <ActionButton onPress={() => parentModalRef.current?.present()}>
                  Open sheet modal inside
                </ActionButton>
                <ActionButton
                  onPress={() => setRnModalOverSheetVisible(false)}
                  tone="dark"
                >
                  Close RN modal
                </ActionButton>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          <BottomSheet
            ref={regularSheetRef}
            index={-1}
            snapPoints={regularSheetSnapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.kicker}>GORHOM / REGULAR</Text>
              <Text style={styles.sheetTitle}>Bottom sheet.</Text>
              <Text style={styles.overlayCopy}>
                Toast visibility from a standard sheet.
              </Text>
              <ToastActionsCard
                source="Regular bottom sheet"
                onOpenNested={() => parentModalRef.current?.present()}
                onOpenModalInside={() => setRnModalOverSheetVisible(true)}
              />
              <ActionButton
                onPress={() => regularSheetRef.current?.close()}
                tone="dark"
              >
                Close sheet
              </ActionButton>
            </BottomSheetView>
          </BottomSheet>

          <BottomSheetModal
            ref={parentModalRef}
            stackBehavior="push"
            index={0}
            snapPoints={modalSnapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.kicker}>GORHOM / LEVEL 01</Text>
              <Text style={styles.sheetTitle}>Sheet modal.</Text>
              <ToastActionsCard
                source="Parent sheet modal"
                onOpenNested={() => nestedModalRef.current?.present()}
              />
              <ActionButton
                onPress={() => parentModalRef.current?.dismiss()}
                tone="dark"
              >
                Close parent sheet
              </ActionButton>
            </BottomSheetView>
          </BottomSheetModal>

          <BottomSheetModal
            ref={nestedModalRef}
            stackBehavior="push"
            index={0}
            snapPoints={modalSnapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.kicker}>GORHOM / LEVEL 02</Text>
              <Text style={styles.sheetTitle}>Nested sheet.</Text>
              <ToastActionsCard
                source="Nested sheet modal"
                onOpenNested={() => thirdModalRef.current?.present()}
              />
              <ActionButton
                onPress={() => nestedModalRef.current?.dismiss()}
                tone="dark"
              >
                Close nested sheet
              </ActionButton>
            </BottomSheetView>
          </BottomSheetModal>

          <BottomSheetModal
            ref={thirdModalRef}
            stackBehavior="push"
            index={0}
            snapPoints={['50%', '85%']}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.kicker}>GORHOM / LEVEL 03</Text>
              <Text style={styles.sheetTitle}>Three deep.</Text>
              <ToastActionsCard source="Triple-nested sheet" />
              <ActionButton
                onPress={() => thirdModalRef.current?.dismiss()}
                tone="dark"
              >
                Close final sheet
              </ActionButton>
            </BottomSheetView>
          </BottomSheetModal>
          <SuperToastHost />
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.paper },
  modalRoot: { flex: 1, backgroundColor: COLORS.paper },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 16,
  },
  intro: { paddingTop: 4, paddingBottom: 18 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 38 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  markText: {
    color: COLORS.white,
    fontFamily: 'Karla-Bold',
    fontSize: 11,
    letterSpacing: -0.5,
  },
  wordmark: {
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
    marginHorizontal: 12,
  },
  version: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  kicker: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 10,
  },
  title: {
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 48,
    lineHeight: 47,
    letterSpacing: -2.2,
    marginBottom: 18,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: 'Karla-Italic',
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 330,
  },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 14,
    marginBottom: 12,
  },
  eyebrow: {
    width: 72,
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  cardTitle: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 19,
    letterSpacing: -0.4,
  },
  actionList: { gap: 8 },
  button: {
    minHeight: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDark: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  buttonQuiet: { backgroundColor: COLORS.soft, borderColor: COLORS.soft },
  buttonPressed: { opacity: 0.58, transform: [{ scale: 0.99 }] },
  buttonLabel: {
    flex: 1,
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 14,
  },
  buttonLabelDark: { color: COLORS.white },
  buttonArrow: { color: COLORS.muted, fontSize: 15 },
  dismissAll: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dismissAllText: {
    flex: 1,
    color: COLORS.white,
    fontFamily: 'Karla-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  dismissAllIcon: { color: COLORS.white, fontSize: 24, fontWeight: '300' },
  footer: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginTop: 12,
  },
  transparentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  transparentModalCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  overlayTitle: {
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 30,
    letterSpacing: -1,
    marginBottom: 8,
  },
  overlayCopy: {
    color: COLORS.muted,
    fontFamily: 'Karla-Italic',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  sheetBackground: { backgroundColor: COLORS.paper },
  sheetHandle: { backgroundColor: COLORS.ink, width: 36 },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
  },
  sheetTitle: {
    color: COLORS.ink,
    fontFamily: 'Karla-Bold',
    fontSize: 32,
    letterSpacing: -1.1,
  },
});
