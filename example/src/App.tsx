import { useCallback, useMemo, useRef, useState } from 'react';
import type { ElementRef, ReactNode } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { toast, Toaster } from 'react-native-super-toast';
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
} as const;

const POSITIONS: ToastPosition[] = ['top-center', 'bottom-center', 'center'];
const THEMES: ToastTheme[] = ['system', 'light', 'dark'];
const SWIPE_DIRECTIONS: ToastSwipeDirection[] = ['up', 'left'];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function next<T>(values: T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length]!;
}

function ActionButton({
  children,
  onPress,
  value,
  tone = 'light',
}: {
  children: ReactNode;
  onPress: () => void;
  value?: string;
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
        style={[styles.buttonValue, tone === 'dark' && styles.buttonLabelDark]}
      >
        {value ?? '↗'}
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
        <Text style={styles.version}>DEMO / 02</Text>
      </View>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{copy}</Text>
    </View>
  );
}

function useToastDemos(source: string) {
  const lastId = useRef<ToastId | null>(null);
  const bellIcon = useMemo(
    () =>
      FontAwesomeFreeSolid.getImageSourceSync('bell', {
        size: 20,
        color: COLORS.ink,
      }),
    []
  );

  const remember = (id: ToastId) => {
    lastId.current = id;
    return id;
  };

  return {
    plain: () => remember(toast('Event has been created')),
    description: () =>
      remember(
        toast('Event has been created', {
          description: `Monday, January 3rd at 6:00pm · ${source}`,
        })
      ),
    success: () =>
      remember(toast.success('Changes saved', { description: source })),
    error: () =>
      remember(toast.error('Could not reach the server', { haptic: true })),
    warning: () =>
      remember(toast.warning('Storage almost full', { description: '92%' })),
    info: () =>
      remember(toast.info('New version available', { closeButton: true })),
    action: () =>
      remember(
        toast('Message archived', {
          action: {
            label: 'Undo',
            onClick: () => toast.success('Message restored'),
          },
        })
      ),
    confirm: () =>
      remember(
        toast('Delete 3 files?', {
          description: 'This cannot be undone.',
          duration: Infinity,
          action: {
            label: 'Delete',
            onClick: () => toast.success('Files deleted'),
          },
          cancel: { label: 'Keep', onClick: () => {} },
          onDismiss: () => toast.info('Kept your files'),
        })
      ),
    promise: (shouldFail: boolean) =>
      remember(
        toast.promise(
          wait(2000).then(() => {
            if (shouldFail) throw new Error('Upload rejected');
            return 'report.pdf';
          }),
          {
            loading: 'Uploading…',
            success: (file) => `${file} uploaded`,
            error: (reason) => (reason as Error).message,
          }
        )
      ),
    icon: () =>
      remember(
        toast('New message', {
          description: `A notification from ${source}.`,
          icon: { type: 'image', source: bellIcon, size: 20 },
        })
      ),
    pngIcon: () =>
      remember(
        toast('Added to cart', {
          description: 'Super Toast T-Shirt is in your cart.',
          icon: {
            type: 'image',
            source: require('../assets/shopping-cart.png'),
            size: 20,
            tintColor: COLORS.ink,
          },
        })
      ),
    styled: () =>
      remember(
        toast.success('Custom typography', {
          description: 'Fonts, colors, and radius come from styles.',
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
    },
  };
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
  const demos = useToastDemos(source);

  return (
    <Section index="TOAST LAB" title={source}>
      <ActionButton onPress={demos.success}>Success</ActionButton>
      <ActionButton onPress={demos.action}>With action</ActionButton>
      <ActionButton onPress={() => demos.promise(false)}>Promise</ActionButton>
      <ActionButton onPress={demos.icon}>Vector icon</ActionButton>
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
  const [position, setPosition] = useState<ToastPosition>('top-center');
  const [theme, setTheme] = useState<ToastTheme>('system');
  const [swipeDirection, setSwipeDirection] =
    useState<ToastSwipeDirection>('up');
  const [richColors, setRichColors] = useState(false);
  const [closeButton, setCloseButton] = useState(false);
  const [enableStacking, setEnableStacking] = useState(false);

  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const [rnModalOverSheetVisible, setRnModalOverSheetVisible] = useState(false);
  const regularSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const parentModalRef = useRef<BottomSheetModal>(null);
  const nestedModalRef = useRef<BottomSheetModal>(null);
  const thirdModalRef = useRef<BottomSheetModal>(null);
  const regularSheetSnapPoints = useMemo(() => ['45%', '85%'], []);
  const modalSnapPoints = useMemo(() => ['55%', '90%'], []);

  const demos = useToastDemos('main screen');

  const showBurst = useCallback(() => {
    [
      'Changes saved',
      'New message received',
      'Background sync complete',
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

  const onOff = (value: boolean) => (value ? 'ON' : 'OFF');

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
              copy="Sonner-style toasts that stay above modals and bottom sheets."
            />

            <Section index="01" title="Variants">
              <ActionButton onPress={demos.plain}>Default</ActionButton>
              <ActionButton onPress={demos.description}>
                With description
              </ActionButton>
              <ActionButton onPress={demos.success}>Success</ActionButton>
              <ActionButton onPress={demos.error}>Error</ActionButton>
              <ActionButton onPress={demos.warning}>Warning</ActionButton>
              <ActionButton onPress={demos.info}>Info + close</ActionButton>
            </Section>

            <Section index="02" title="Interactions">
              <ActionButton onPress={demos.action}>Action</ActionButton>
              <ActionButton onPress={demos.confirm}>
                Action + cancel
              </ActionButton>
              <ActionButton onPress={() => demos.promise(false)}>
                Promise success
              </ActionButton>
              <ActionButton onPress={() => demos.promise(true)}>
                Promise failure
              </ActionButton>
              <ActionButton onPress={demos.wiggle} tone="quiet">
                Wiggle last toast
              </ActionButton>
              <ActionButton onPress={showBurst} tone="dark">
                Show three toasts
              </ActionButton>
            </Section>

            <Section index="03" title="Icons & styles">
              <ActionButton onPress={demos.pngIcon}>PNG icon</ActionButton>
              <ActionButton onPress={demos.icon}>Vector icon</ActionButton>
              <ActionButton onPress={demos.styled}>Custom styles</ActionButton>
            </Section>

            <Section index="04" title="Toaster">
              <ActionButton
                onPress={() => setPosition(next(POSITIONS, position))}
                value={position}
              >
                Position
              </ActionButton>
              <ActionButton
                onPress={() => setTheme(next(THEMES, theme))}
                value={theme}
              >
                Theme
              </ActionButton>
              <ActionButton
                onPress={() => setRichColors(!richColors)}
                value={onOff(richColors)}
              >
                Rich colors
              </ActionButton>
              <ActionButton
                onPress={() => setCloseButton(!closeButton)}
                value={onOff(closeButton)}
              >
                Close button
              </ActionButton>
              <ActionButton
                onPress={() => setEnableStacking(!enableStacking)}
                value={onOff(enableStacking)}
              >
                Stacking
              </ActionButton>
              <ActionButton
                onPress={() =>
                  setSwipeDirection(next(SWIPE_DIRECTIONS, swipeDirection))
                }
                value={swipeDirection}
              >
                Swipe direction
              </ActionButton>
            </Section>

            <Section index="05" title="Native modals">
              <ActionButton onPress={() => setPageSheetModalVisible(true)}>
                Open page sheet
              </ActionButton>
              <ActionButton onPress={() => setTransparentModalVisible(true)}>
                Open transparent modal
              </ActionButton>
            </Section>

            <Section index="06" title="Bottom sheets">
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
              onPress={() => toast.dismiss()}
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
                <PageIntro
                  label="NATIVE LAYER / 01"
                  title="Page sheet."
                  copy="Toasts remain visible above a standard React Native modal."
                />
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
                  <ActionButton onPress={demos.success}>Success</ActionButton>
                  <ActionButton onPress={demos.confirm}>
                    Action + cancel
                  </ActionButton>
                  <ActionButton onPress={() => demos.promise(false)}>
                    Promise
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
                <PageIntro
                  label="COMPOSITE LAYER"
                  title="Modal + sheet."
                  copy="The toast stays above both native and Gorhom layers."
                />
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

          <Toaster
            position={position}
            theme={theme}
            richColors={richColors}
            closeButton={closeButton}
            enableStacking={enableStacking}
            swipeToDismissDirection={swipeDirection}
          />
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
  buttonValue: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
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
