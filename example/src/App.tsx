import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ElementRef } from 'react';
import {
  Button,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';

import SuperToast, { SuperToastHost } from 'react-native-super-toast';
import type { ToastKind } from 'react-native-super-toast';
import { FontAwesomeFreeSolid } from '@react-native-vector-icons/fontawesome-free-solid';
// or use the static version to embed the font at build time instead of loading it at runtime

import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function getBackgroundColor(type: ToastKind) {
  switch (type) {
    case 'success':
      return '#047857';
    case 'error':
      return '#B91C1C';
    case 'warning':
      return '#F59E0B';
    case 'info':
      return '#1D4ED8';
    default:
      return '#171717';
  }
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

  const showTextIcon = () =>
    SuperToast.success({
      message: `Synced data successfully from ${source}.`,
      icon: '✓',
      backgroundColor: getBackgroundColor('success'),
    });

  const showPngIcon = () =>
    SuperToast.show({
      title: 'Item added to cart',
      message: `You added "Super Toast T-Shirt" to your cart.`,
      icon: {
        type: 'image',
        source: require('../assets/shopping-cart.png'),
        size: 24,
        cornerRadius: 4,
      },
      backgroundColor: getBackgroundColor('success'),
      titleColor: '#FFFFFF',
      messageColor: '#FFFFFF',
    });

  const showFontIcon = useCallback(() => {
    const bellIconSource = FontAwesomeFreeSolid.getImageSourceSync('bell', {
      size: 24,
      color: '#FFFFFF',
    });
    SuperToast.show({
      title: 'New Message',
      message: `Aswin sent you a message from ${source}.`,
      icon: {
        type: 'image',
        source: bellIconSource,
        size: 24,
        cornerRadius: 4,
      },
      backgroundColor: getBackgroundColor('default'),
      titleColor: '#FFFFFF',
      messageColor: '#CBD5E1',
    });
  }, [source]);

  const showLoadingIcon = () => {
    if (loadingToastId.current) return;
    loadingToastId.current = SuperToast.loading({
      title: 'Uploading',
      message: `Persistent toast triggered from ${source}.`,
      duration: 0,
      backgroundColor: getBackgroundColor('loading'),
      closeOnPress: false,
      swipeToDismiss: false,
    });
  };

  const dismissLoading = () => {
    if (!loadingToastId.current) return;
    SuperToast.dismiss(loadingToastId.current);
    loadingToastId.current = null;
    SuperToast.success({
      title: 'Done',
      message: 'Loading toast dismissed.',
      icon: '✓',
      backgroundColor: getBackgroundColor('success'),
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{source}</Text>

      <Button title="Text icon toast" onPress={showTextIcon} />
      <View style={styles.gap} />
      <Button title="PNG icon toast" onPress={showPngIcon} />
      <View style={styles.gap} />
      <Button title="Font/vector icon toast" onPress={showFontIcon} />
      <View style={styles.gap} />
      <Button title="Loading toast" onPress={showLoadingIcon} />
      <View style={styles.gap} />
      <Button title="Dismiss loading toast" onPress={dismissLoading} />

      {onOpenNested ? (
        <>
          <View style={styles.gap} />
          <Button
            title="Open nested bottom sheet"
            onPress={onOpenNested}
            color="#7C3AED"
          />
        </>
      ) : null}

      {onOpenModalInside ? (
        <>
          <View style={styles.gap} />
          <Button
            title="Open React Native Modal above sheet"
            onPress={onOpenModalInside}
            color="#B91C1C"
          />
        </>
      ) : null}
    </View>
  );
}

export default function App() {
  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const [rnModalOverSheetVisible, setRnModalOverSheetVisible] = useState(false);
  const loadingToastId = useRef<string | null>(null);

  // Refs for the inner BottomSheet (regular, not modal)
  const regularSheetRef = useRef<ElementRef<typeof BottomSheet>>(null);

  // Refs for Gorhom BottomSheetModal stack (parent + nested)
  const parentModalRef = useRef<BottomSheetModal>(null);
  const nestedModalRef = useRef<BottomSheetModal>(null);
  const thirdModalRef = useRef<BottomSheetModal>(null);

  const regularSheetSnapPoints = useMemo(() => ['45%', '85%'], []);
  const modalSnapPoints = useMemo(() => ['55%', '90%'], []);

  const bellIconSource = useMemo(() => {
    return FontAwesomeFreeSolid.getImageSourceSync('bell', {
      size: 24,
      color: '#FFFFFF',
    });
  }, []);

  useEffect(() => {
    SuperToast.configure({
      position: 'top',
      duration: 3000,
      animation: 'slide',
      enterDuration: 540,
      exitDuration: 230,
      widthMode: 'screen',
      topOffset: Platform.OS === 'ios' ? 8 : 54,
      bottomOffset: Platform.OS === 'ios' ? 24 : 64,
      horizontalMargin: 16,
      maxWidth: 340,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 10,
      titleSize: 15,
      messageSize: 13,
      swipeToDismiss: false,
      closeOnPress: true,
      queue: false,
      stack: true,
      stackLimit: 3,
      stackOffset: 10,
      haptic: false,
    });
  }, []);

  function showTextIcon(source: string) {
    SuperToast.success({
      message: `Synced data successfully from ${source}.`,
      icon: '✓',
      backgroundColor: getBackgroundColor('success'),
    });
  }

  function showPngIcon() {
    SuperToast.show({
      title: 'Item added to cart',
      message: `You added "Super Toast T-Shirt" to your cart.`,
      icon: {
        type: 'image',
        source: require('../assets/shopping-cart.png'),
        size: 24,
        cornerRadius: 4,
      },
      backgroundColor: getBackgroundColor('success'),
      titleColor: '#FFFFFF',
      messageColor: '#FFFFFF',
    });
  }

  function showFontIcon(source: string) {
    SuperToast.show({
      title: 'New Message',
      message: `Aswin sent you a message from ${source}.`,
      icon: {
        type: 'image',
        source: bellIconSource,
        size: 24,
        cornerRadius: 4,
      },
      backgroundColor: getBackgroundColor('default'),
      titleColor: '#FFFFFF',
      messageColor: '#CBD5E1',
    });
  }

  function showLoadingIcon(source: string) {
    if (loadingToastId.current) {
      return;
    }

    loadingToastId.current = SuperToast.loading({
      title: 'Uploading',
      message: `Persistent toast triggered from ${source}.`,
      duration: 0,
      backgroundColor: getBackgroundColor('loading'),
      closeOnPress: false,
      swipeToDismiss: false,
    });
  }

  async function simulateUpload(shouldFail: boolean) {
    if (loadingToastId.current) return;

    const toastId = SuperToast.loading({
      title: 'Uploading file',
      message: 'Preparing your upload…',
      duration: 0,
      backgroundColor: getBackgroundColor('loading'),
      closeOnPress: false,
      swipeToDismiss: false,
    });
    loadingToastId.current = toastId;

    await new Promise((resolve) => setTimeout(resolve, 2200));

    SuperToast.update(toastId, {
      kind: shouldFail ? 'error' : 'success',
      backgroundColor: getBackgroundColor(shouldFail ? 'error' : 'success'),
      title: shouldFail ? 'Upload failed' : 'Upload complete',
      message: shouldFail
        ? 'The server rejected the simulated upload.'
        : 'Your simulated file was uploaded successfully.',
      duration: 2500,
      closeOnPress: true,
      swipeToDismiss: true,
      haptic: true,
    });
    loadingToastId.current = null;
  }

  function dismissLoadingIcon() {
    if (!loadingToastId.current) {
      return;
    }

    SuperToast.dismiss(loadingToastId.current);
    loadingToastId.current = null;

    SuperToast.success({
      title: 'Done',
      message: 'Loading toast dismissed.',
      icon: '✓',
      backgroundColor: getBackgroundColor('success'),
    });
  }

  function showStackDemo() {
    const variants: ToastKind[] = ['success', 'info', 'warning'];
    const messages = [
      'Your changes were saved.',
      'A new message just arrived.',
      'Background sync completed.',
    ];

    messages.forEach((message, index) => {
      setTimeout(() => {
        SuperToast.show({
          kind: variants[index],
          title: `Stacked toast ${index + 1}`,
          message,
          backgroundColor: getBackgroundColor(variants[index] ?? 'default'),
          duration: 3200 + index * 500,
          stack: true,
        });
      }, index * 450);
    });
  }

  function openRegularSheet() {
    regularSheetRef.current?.snapToIndex(0);
  }

  function closeRegularSheet() {
    regularSheetRef.current?.close();
  }

  function openParentModal() {
    parentModalRef.current?.present();
  }

  function closeParentModal() {
    parentModalRef.current?.dismiss();
  }

  function openNestedModal() {
    nestedModalRef.current?.present();
  }

  function closeNestedModal() {
    nestedModalRef.current?.dismiss();
  }

  function openThirdModal() {
    thirdModalRef.current?.present();
  }

  function closeThirdModal() {
    thirdModalRef.current?.dismiss();
  }

  function renderBackdrop(props: BottomSheetBackdropProps) {
    return (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        <SafeAreaView style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Super Toast Icon + Modal Test</Text>

            <Text style={styles.subtitle}>
              This tests text icons, PNG icons, and font/vector icons above
              normal and transparent React Native Modals, as well as Gorhom
              bottom sheets (regular, nested, and stacked with React Native
              Modals).
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Main screen</Text>

              <Button
                title="Show text icon toast"
                onPress={() => showTextIcon('main screen')}
              />

              <View style={styles.gap} />

              <Button
                title="Show PNG icon toast"
                onPress={() => showPngIcon()}
              />

              <View style={styles.gap} />

              <Button
                title="Show font/vector icon toast"
                onPress={() => showFontIcon('main screen')}
              />

              <View style={styles.gap} />

              <Button
                title="Show loading icon toast"
                onPress={() => showLoadingIcon('main screen')}
              />

              <View style={styles.gap} />

              <Button
                title="Dismiss loading toast"
                onPress={dismissLoadingIcon}
              />

              <View style={styles.gap} />

              <Button
                title="Simulate successful upload"
                onPress={() => simulateUpload(false)}
              />

              <View style={styles.gap} />

              <Button
                title="Simulate failed upload"
                onPress={() => simulateUpload(true)}
              />

              <View style={styles.gap} />

              <Button title="Show stacked toast demo" onPress={showStackDemo} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>React Native Modal tests</Text>

              <Button
                title="Open pageSheet modal"
                onPress={() => setPageSheetModalVisible(true)}
              />

              <View style={styles.gap} />

              <Button
                title="Open transparent modal"
                onPress={() => setTransparentModalVisible(true)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gorhom Bottom Sheet tests</Text>

              <Button
                title="Open regular BottomSheet"
                onPress={openRegularSheet}
                color="#0F766E"
              />

              <View style={styles.gap} />

              <Button
                title="Open BottomSheetModal"
                onPress={openParentModal}
                color="#0F766E"
              />

              <View style={styles.gap} />

              <Button
                title="Open BottomSheetModal over RN Modal"
                onPress={() => {
                  setRnModalOverSheetVisible(true);
                }}
                color="#B91C1C"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Global controls</Text>

              <Button
                title="Dismiss all toasts"
                onPress={SuperToast.dismissAll}
              />
            </View>
          </ScrollView>

          {/* ============================================================ */}
          {/* React Native Modals                                          */}
          {/* ============================================================ */}
          <Modal
            visible={pageSheetModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setPageSheetModalVisible(false)}
          >
            <SafeAreaView style={styles.modalRoot}>
              <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Page Sheet Modal</Text>

                <Text style={styles.subtitle}>
                  These toasts should render above this normal React Native
                  Modal.
                </Text>

                <ToastActionsCard
                  source="pageSheet modal"
                  onOpenNested={openParentModal}
                />

                <View style={styles.gap} />

                <Button
                  title="Close modal"
                  onPress={() => setPageSheetModalVisible(false)}
                />
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
                <Text style={styles.transparentTitle}>Transparent Modal</Text>

                <Text style={styles.transparentSubtitle}>
                  These toasts should render above this transparent modal.
                </Text>

                <Button
                  title="Text icon above transparent modal"
                  onPress={() => showTextIcon('transparent modal')}
                />

                <View style={styles.gap} />

                <Button
                  title="PNG icon above transparent modal"
                  onPress={() => showPngIcon()}
                />

                <View style={styles.gap} />

                <Button
                  title="Font/vector icon above transparent modal"
                  onPress={() => showFontIcon('transparent modal')}
                />

                <View style={styles.gap} />

                <Button
                  title="Loading icon above transparent modal"
                  onPress={() => showLoadingIcon('transparent modal')}
                />

                <View style={styles.gap} />

                <Button
                  title="Dismiss loading toast"
                  onPress={dismissLoadingIcon}
                />

                <View style={styles.gap} />

                <Button
                  title="Close transparent modal"
                  onPress={() => setTransparentModalVisible(false)}
                />
              </View>
            </View>
          </Modal>

          {/* RN Modal with Gorhom sheet inside (modal over sheet) */}
          <Modal
            visible={rnModalOverSheetVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setRnModalOverSheetVisible(false)}
          >
            <SafeAreaView style={styles.modalRoot}>
              <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>RN Modal hosting BottomSheet</Text>

                <Text style={styles.subtitle}>
                  The toast must appear above both the React Native Modal and
                  the Gorhom BottomSheet opened inside it.
                </Text>

                <ToastActionsCard source="RN Modal → BottomSheet inside" />

                <View style={styles.gap} />

                <Button
                  title="Open Gorhom BottomSheet inside this RN Modal"
                  onPress={openRegularSheet}
                  color="#0F766E"
                />

                <View style={styles.gap} />

                <Button
                  title="Open Gorhom BottomSheetModal inside this RN Modal"
                  onPress={openParentModal}
                  color="#0F766E"
                />

                <View style={styles.gap} />

                <Button
                  title="Close RN Modal"
                  onPress={() => setRnModalOverSheetVisible(false)}
                />
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* ============================================================ */}
          {/* Gorhom BottomSheet (regular, not modal stack)                */}
          {/* ============================================================ */}
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
              <Text style={styles.sheetTitle}>Regular Gorhom BottomSheet</Text>

              <Text style={styles.subtitle}>
                Toasts should render above this bottom sheet on iOS and Android.
              </Text>

              <ToastActionsCard
                source="regular BottomSheet"
                onOpenNested={openParentModal}
                onOpenModalInside={() => setRnModalOverSheetVisible(true)}
              />

              <View style={styles.gap} />

              <Button
                title="Close regular sheet"
                onPress={closeRegularSheet}
                color="#0F766E"
              />
            </BottomSheetView>
          </BottomSheet>

          {/* ============================================================ */}
          {/* Gorhom BottomSheetModal (stacked with BottomSheetModalProvider) */}
          {/* ============================================================ */}
          <BottomSheetModal
            ref={parentModalRef}
            index={0}
            snapPoints={modalSnapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>Gorhom BottomSheetModal</Text>

              <Text style={styles.subtitle}>
                This is a Gorhom BottomSheetModal. Toasts should appear above
                it, and we can stack a nested BottomSheetModal on top.
              </Text>

              <ToastActionsCard
                source="BottomSheetModal (parent)"
                onOpenNested={openNestedModal}
              />

              <View style={styles.gap} />

              <Button
                title="Close parent BottomSheetModal"
                onPress={closeParentModal}
                color="#7C3AED"
              />
            </BottomSheetView>
          </BottomSheetModal>

          {/* Nested Gorhom BottomSheetModal opened from inside the parent */}
          <BottomSheetModal
            ref={nestedModalRef}
            index={0}
            snapPoints={modalSnapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>
                Nested Gorhom BottomSheetModal
              </Text>

              <Text style={styles.subtitle}>
                Opened from inside the parent BottomSheetModal. The toast must
                still render above this nested sheet.
              </Text>

              <ToastActionsCard
                source="Nested BottomSheetModal"
                onOpenNested={openThirdModal}
              />

              <View style={styles.gap} />

              <Button
                title="Close nested BottomSheetModal"
                onPress={closeNestedModal}
                color="#7C3AED"
              />
            </BottomSheetView>
          </BottomSheetModal>

          {/* Third level nested Gorhom BottomSheetModal */}
          <BottomSheetModal
            ref={thirdModalRef}
            index={0}
            snapPoints={['50%', '85%']}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
          >
            <BottomSheetView style={styles.sheetContent}>
              <Text style={styles.sheetTitle}>
                Triple-nested Gorhom BottomSheetModal
              </Text>

              <Text style={styles.subtitle}>
                Three layers deep. Toasts must remain visible above all of them.
              </Text>

              <ToastActionsCard source="Triple-nested BottomSheetModal" />

              <View style={styles.gap} />

              <Button
                title="Close triple-nested sheet"
                onPress={closeThirdModal}
                color="#7C3AED"
              />
            </BottomSheetView>
          </BottomSheetModal>

          <SuperToastHost />
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  gap: {
    height: 12,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  transparentBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  transparentModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  transparentTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  transparentSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    marginBottom: 16,
  },
  sheetBackground: {
    backgroundColor: '#ECFDF5',
  },
  sheetHandle: {
    backgroundColor: '#0F766E',
  },
  sheetContent: {
    flex: 1,
    padding: 20,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 8,
  },
});
