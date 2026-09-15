import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ElementRef, ReactNode } from 'react';
import {
  Modal,
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
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

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
const SWIPE_DIRECTIONS: ToastSwipeDirection[] = ['up', 'left'];

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

// Image icons are not themed natively, so tint them to match the toast theme.
const IconColorContext = createContext<string>(COLORS.ink);

function useToastDemos(source: string, iconColor: string) {
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
    plain: () => remember(toast('Event created')),
    loading: () => remember(toast.loading('Syncing data…', { duration: 2500 })),
    description: () =>
      remember(
        toast('Event created', {
          description: `Created from ${source}`,
        })
      ),
    success: () =>
      remember(toast.success('Changes saved', { description: source })),
    error: () => remember(toast.error('Server unavailable', { haptic: true })),
    warning: () =>
      remember(toast.warning('Storage almost full', { description: '92%' })),
    info: () => remember(toast.info('Update available', { closeButton: true })),
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
          cancel: { label: 'Keep', onClick: () => toast.info('Files kept') },
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
            tintColor: iconColor,
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
      else remember(toast.info('Show a toast first'));
    },
  };
}

function ToastActionsCard({
  source,
  onOpenNested,
  exampleCount = 4,
}: {
  source: string;
  onOpenNested?: () => void;
  exampleCount?: number;
}) {
  const demos = useToastDemos(source, useContext(IconColorContext));
  const examples = [
    { label: 'Success', onPress: demos.success },
    { label: 'With action', onPress: demos.action },
    { label: 'Promise', onPress: () => demos.promise(false) },
    { label: 'Vector icon', onPress: demos.icon },
  ].slice(0, exampleCount);

  return (
    <Section title="Examples">
      {examples.map((example) => (
        <ActionButton key={example.label} onPress={example.onPress}>
          {example.label}
        </ActionButton>
      ))}
      {onOpenNested ? (
        <ActionButton onPress={onOpenNested} tone="dark">
          Open nested sheet
        </ActionButton>
      ) : null}
    </Section>
  );
}

export default function App() {
  const { height: windowHeight } = useWindowDimensions();
  const [position, setPosition] = useState<ToastPosition>('top-center');
  const [theme, setTheme] = useState<ToastTheme>('system');
  const [swipeDirection, setSwipeDirection] =
    useState<ToastSwipeDirection>('up');
  const [richColors, setRichColors] = useState(false);
  const [closeButton, setCloseButton] = useState(false);
  const [enableStacking, setEnableStacking] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const systemScheme = useColorScheme();
  const darkToasts =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');
  const iconColor = darkToasts ? COLORS.white : COLORS.ink;

  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const regularSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const parentModalRef = useRef<BottomSheetModal>(null);
  const nestedModalRef = useRef<BottomSheetModal>(null);
  const thirdModalRef = useRef<BottomSheetModal>(null);

  const demos = useToastDemos('main screen', iconColor);

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
                  title="Super Toast"
                  subtitle="Tap an example to preview."
                />

                <Section title="Variants">
                  <ActionButton onPress={demos.plain}>Default</ActionButton>
                  <ActionButton onPress={demos.description}>
                    With description
                  </ActionButton>
                  <ActionButton onPress={demos.success}>Success</ActionButton>
                  <ActionButton onPress={demos.error}>Error</ActionButton>
                  <ActionButton onPress={demos.warning}>Warning</ActionButton>
                  <ActionButton onPress={demos.info}>Info</ActionButton>
                  <ActionButton onPress={demos.loading}>Loading</ActionButton>
                </Section>

                <Section title="Interactions">
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
                  <ActionButton onPress={demos.wiggle}>
                    Wiggle last toast
                  </ActionButton>
                  <ActionButton onPress={showBurst}>
                    Show three toasts
                  </ActionButton>
                </Section>

                <Section title="Icons & styles">
                  <ActionButton onPress={demos.pngIcon}>PNG icon</ActionButton>
                  <ActionButton onPress={demos.icon}>Vector icon</ActionButton>
                  <ActionButton onPress={demos.styled}>
                    Custom styles
                  </ActionButton>
                </Section>

                <Section title="Native modals">
                  <ActionButton onPress={() => setPageSheetModalVisible(true)}>
                    Open page sheet
                  </ActionButton>
                  <ActionButton
                    onPress={() => setTransparentModalVisible(true)}
                  >
                    Open transparent modal
                  </ActionButton>
                </Section>

                <Section title="Bottom sheets">
                  <ActionButton
                    onPress={() => regularSheetRef.current?.snapToIndex(0)}
                  >
                    Open regular sheet
                  </ActionButton>
                  <ActionButton
                    onPress={() => parentModalRef.current?.present()}
                  >
                    Open sheet modal
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
                  <Text style={styles.dismissAllText}>Dismiss all</Text>
                  <Text style={styles.dismissAllIcon}>×</Text>
                </Pressable>
              </ScrollView>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open toast settings"
                onPress={() => setSettingsVisible(true)}
                style={({ pressed }) => [
                  styles.settingsButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.settingsIcon}>⚙</Text>
                <Text style={styles.settingsButtonText}>Settings</Text>
              </Pressable>

              <Modal
                visible={settingsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSettingsVisible(false)}
              >
                <GestureHandlerRootView style={styles.settingsOverlay}>
                  <SafeAreaProvider style={styles.settingsOverlay}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close toast settings"
                      onPress={() => setSettingsVisible(false)}
                      style={styles.settingsBackdrop}
                    />
                    <SafeAreaView
                      edges={['bottom']}
                      style={[
                        styles.settingsPanel,
                        { maxHeight: windowHeight * 0.78 },
                      ]}
                    >
                      <View style={styles.settingsHeader}>
                        <Text style={styles.settingsTitle}>Settings</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Close toast settings"
                          onPress={() => setSettingsVisible(false)}
                          style={styles.settingsClose}
                        >
                          <Text style={styles.settingsCloseText}>×</Text>
                        </Pressable>
                      </View>
                      <ScrollView
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
                      </ScrollView>
                    </SafeAreaView>
                  </SafeAreaProvider>
                </GestureHandlerRootView>
              </Modal>

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
                          title="Page sheet"
                          subtitle="Toast above a native modal."
                        />
                        <ToastActionsCard source="Page sheet" />
                        <ActionButton
                          onPress={() => setPageSheetModalVisible(false)}
                          tone="dark"
                        >
                          Close page sheet
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
                      title="Transparent modal"
                      subtitle="Toast above a transparent modal."
                    />
                    <View style={styles.actionList}>
                      <ActionButton onPress={demos.success}>
                        Success
                      </ActionButton>
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
                  <PageHeader title="Bottom sheet" />
                  <ToastActionsCard
                    source="Regular bottom sheet"
                    onOpenNested={() => parentModalRef.current?.present()}
                  />
                  <ActionButton
                    onPress={() => regularSheetRef.current?.close()}
                    tone="dark"
                  >
                    Close sheet
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
                  <PageHeader title="Sheet modal" />
                  <ToastActionsCard
                    source="Parent sheet modal"
                    exampleCount={3}
                    onOpenNested={() => nestedModalRef.current?.present()}
                  />
                  <ActionButton
                    onPress={() => parentModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Close parent sheet
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
                  <PageHeader title="Nested sheet" />
                  <ToastActionsCard
                    source="Nested sheet modal"
                    exampleCount={2}
                    onOpenNested={() => thirdModalRef.current?.present()}
                  />
                  <ActionButton
                    onPress={() => nestedModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Close nested sheet
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
                  <PageHeader title="Third sheet" />
                  <ToastActionsCard
                    source="Triple-nested sheet"
                    exampleCount={2}
                  />
                  <ActionButton
                    onPress={() => thirdModalRef.current?.dismiss()}
                    tone="dark"
                  >
                    Close final sheet
                  </ActionButton>
                </BottomSheetScrollView>
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
  settingsButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    minHeight: 49,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: COLORS.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  settingsIcon: { color: COLORS.white, fontSize: 21, lineHeight: 25 },
  settingsButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  settingsOverlay: { flex: 1, justifyContent: 'flex-end' },
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  settingsPanel: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  settingsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 15,
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
  settingsContent: { paddingHorizontal: 20, paddingTop: 6 },
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
  sheetHandle: { backgroundColor: COLORS.muted, width: 36 },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
});
