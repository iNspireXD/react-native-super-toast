import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Button,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import SuperToast, { SuperToastHost } from 'react-native-super-toast';
import { FontAwesomeFreeSolid } from '@react-native-vector-icons/fontawesome-free-solid';
// or use the static version to embed the font at build time instead of loading it at runtime

export default function App() {
  const [pageSheetModalVisible, setPageSheetModalVisible] = useState(false);
  const [transparentModalVisible, setTransparentModalVisible] = useState(false);
  const loadingToastId = useRef<string | null>(null);

  const rocketSource = useMemo(() => {
    return FontAwesomeFreeSolid.getImageSourceSync('rocket', {
      size: 30,
      color: '#FFFFFF',
    });
  }, []);

  useEffect(() => {
    SuperToast.configure({
      position: 'top',
      duration: 3000,
      animation: 'slide',
      widthMode: 'screen',
      topOffset: 65,
      bottomOffset: 24,
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
      haptic: false,
    });
  }, []);

  function showTextIcon(source: string) {
    SuperToast.success({
      title: 'Text icon',
      message: `Triggered from ${source}.`,
      icon: '✓',
    });
  }

  function showPngIcon(source: string) {
    SuperToast.show({
      title: 'PNG icon',
      message: `PNG asset triggered from ${source}.`,
      icon: {
        type: 'image',
        source: require('../assets/logo.png'),
        size: 24,
        cornerRadius: 4,
      },
      backgroundColor: '#064E3B',
      titleColor: '#FFFFFF',
      messageColor: '#D1FAE5',
    });
  }

  function showFontIcon(source: string) {
    SuperToast.show({
      title: 'Font/vector icon',
      message: `Native icon font glyph triggered from ${source}.`,
      icon: {
        type: 'image',
        source: rocketSource,
        size: 30,
      },
      backgroundColor: '#1E293B',
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
      closeOnPress: false,
      swipeToDismiss: false,
    });
    loadingToastId.current = toastId;

    await new Promise((resolve) => setTimeout(resolve, 2200));

    SuperToast.update(toastId, {
      kind: shouldFail ? 'error' : 'success',
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
    });
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Super Toast Icon + Modal Test</Text>

        <Text style={styles.subtitle}>
          This tests text icons, PNG icons, and font/vector icons above normal
          and transparent React Native Modals.
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
            onPress={() => showPngIcon('main screen')}
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

          <Button title="Dismiss loading toast" onPress={dismissLoadingIcon} />

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
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Modal tests</Text>

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
          <Text style={styles.cardTitle}>Global controls</Text>

          <Button title="Dismiss all toasts" onPress={SuperToast.dismissAll} />
        </View>
      </ScrollView>

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
              These toasts should render above this normal React Native Modal.
            </Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inside pageSheet modal</Text>

              <Button
                title="Text icon above modal"
                onPress={() => showTextIcon('pageSheet modal')}
              />

              <View style={styles.gap} />

              <Button
                title="PNG icon above modal"
                onPress={() => showPngIcon('pageSheet modal')}
              />

              <View style={styles.gap} />

              <Button
                title="Font/vector icon above modal"
                onPress={() => showFontIcon('pageSheet modal')}
              />

              <View style={styles.gap} />

              <Button
                title="Loading icon above modal"
                onPress={() => showLoadingIcon('pageSheet modal')}
              />

              <View style={styles.gap} />

              <Button
                title="Dismiss loading toast"
                onPress={dismissLoadingIcon}
              />

              <View style={styles.gap} />

              <Button
                title="Close modal"
                onPress={() => setPageSheetModalVisible(false)}
              />
            </View>
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
              onPress={() => showPngIcon('transparent modal')}
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

      <SuperToastHost />
    </SafeAreaView>
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
});
