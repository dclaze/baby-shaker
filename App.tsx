import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SecureStore from 'expo-secure-store';
import { DeviceMotion } from 'expo-sensors';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
type GateMode = 'setupCreate' | 'setupConfirm' | 'unlock' | 'changeCreate' | 'changeConfirm';
type Shape = 'circle' | 'star' | 'heart' | 'triangle';

type Ripple = {
  id: number;
  x: number;
  y: number;
  color: string;
  born: number;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  shape: Shape;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  born: number;
  lifetime: number;
};

const BRAND_COMPANY = 'Openbox';
const BRAND_LINE = 'Bambina';
const APP_NAME = 'Baby Shaker';
const BUILD_MARKER = 'v0.1.0-dev.20260328-0939';
const PASSCODE_KEY = 'openbox-bambina-parent-passcode';
const CORNER_SEQUENCE: Corner[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
const BABY_COLORS = [
  '#FF8FAB',
  '#FFB347',
  '#FDFD96',
  '#77DD77',
  '#AEC6CF',
  '#C3A6FF',
  '#FF9AA2',
  '#FFDAC1',
  '#E2F0CB',
  '#B5EAD7',
  '#C7CEEA',
  '#F8BBD0',
  '#FFE0B2',
  '#B2DFDB',
  '#D1C4E9',
];
const PLAY_MESSAGES = [
  'tap softly',
  'give it a little shake',
  'follow the colors',
  'listen for the chime',
];
const SHAPES: Shape[] = ['circle', 'star', 'heart', 'triangle'];
const BACKGROUNDS = [
  ['#1A0533', '#0D1B4D', '#001A33'],
  ['#1A2500', '#002233', '#1A0022'],
  ['#220033', '#001A22', '#002200'],
  ['#002244', '#220000', '#001122'],
];
const NOTE_FILES = [
  require('./assets/audio/c4.wav'),
  require('./assets/audio/d4.wav'),
  require('./assets/audio/e4.wav'),
  require('./assets/audio/f4.wav'),
  require('./assets/audio/g4.wav'),
  require('./assets/audio/a4.wav'),
  require('./assets/audio/b4.wav'),
  require('./assets/audio/c5.wav'),
];

let nextId = 1;

export default function App() {
  useKeepAwake();

  const [loading, setLoading] = useState(true);
  const [parentPin, setParentPin] = useState<string | null>(null);
  const [gateMode, setGateMode] = useState<GateMode>('unlock');
  const [pinEntry, setPinEntry] = useState('');
  const [pendingPin, setPendingPin] = useState('');
  const [gateVisible, setGateVisible] = useState(false);
  const [parentPanelVisible, setParentPanelVisible] = useState(false);
  const [helperText, setHelperText] = useState('Clockwise corner taps open the parent gate.');
  const [messageIndex, setMessageIndex] = useState(0);
  const [cornerProgress, setCornerProgress] = useState<Corner[]>([]);
  const [interactionCount, setInteractionCount] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [idleHintVisible, setIdleHintVisible] = useState(false);

  const nextRippleId = useRef(1);
  const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIndexRef = useRef(0);
  const lastTouchAtRef = useRef(0);
  const lastShakeAtRef = useRef(0);
  const lastTapAnimationAtRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedSoundsRef = useRef<Audio.Sound[]>([]);
  const toyRotate = useRef(new Animated.Value(0)).current;
  const toyPulse = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const [savedPin] = await Promise.all([
          SecureStore.getItemAsync(PASSCODE_KEY),
          Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: false,
          }),
          new Promise((resolve) => setTimeout(resolve, 1400)),
        ]);

        if (!active) {
          return;
        }

        if (savedPin) {
          setParentPin(savedPin);
          setGateMode('unlock');
          setGateVisible(false);
          setHelperText('Clockwise corner taps open the parent gate.');
        } else {
          setParentPin(null);
          setGateMode('setupCreate');
          setGateVisible(true);
          setHelperText('Create a 4-digit parent passcode to begin.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSounds() {
      const sounds: Audio.Sound[] = [];
      for (const file of NOTE_FILES) {
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        sounds.push(sound);
      }
      if (active) {
        loadedSoundsRef.current = sounds;
      } else {
        await Promise.all(sounds.map((sound) => sound.unloadAsync().catch(() => undefined)));
      }
    }

    loadSounds().catch(() => undefined);

    return () => {
      active = false;
      const sounds = loadedSoundsRef.current;
      loadedSoundsRef.current = [];
      sounds.forEach((sound) => {
        sound.unloadAsync().catch(() => undefined);
      });
    };
  }, []);

  useEffect(() => {
    const configureDevice = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      if (Platform.OS === 'android') {
        await NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
      }
    };

    configureDevice().catch(() => undefined);

    return () => {
      ScreenOrientation.unlockAsync().catch(() => undefined);
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!parentPanelVisible) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        setHelperText('Parent gate: tap the four corners clockwise.');
        return true;
      }

      setParentPanelVisible(false);
      setHelperText('Baby mode resumed.');
      return true;
    });

    return () => subscription.remove();
  }, [parentPanelVisible]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(auraPulse, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [auraPulse, toyPulse]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTick(now);
      setParticles((current) => current.filter((particle) => now - particle.born < particle.lifetime + 100));
      setRipples((current) => current.filter((ripple) => now - ripple.born < 700));
    }, 32);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = DeviceMotion.addListener((motion) => {
      if (!motion.accelerationIncludingGravity || gateVisible || parentPanelVisible) {
        return;
      }

      const now = Date.now();
      const interactionWindowOpen = now - lastTouchAtRef.current <= 2500;
      if (!interactionWindowOpen) {
        Animated.parallel([
          Animated.spring(toyRotate, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.spring(toyPulse, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      // Let the tap animation finish before motion can influence the shaker.
      if (now - lastTapAnimationAtRef.current < 550) {
        return;
      }

      const { x = 0, y = 0, z = 0 } = motion.accelerationIncludingGravity;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const tiltX = Math.max(-1, Math.min(1, x / 3.4));
      const tiltY = Math.max(-1, Math.min(1, y / 3.4));
      const rawTiltStrength = Math.min(1, Math.sqrt(tiltX * tiltX + tiltY * tiltY));
      const tiltStrength = rawTiltStrength < 0.22 ? 0 : (rawTiltStrength - 0.22) / 0.78;

      Animated.parallel([
        Animated.spring(toyRotate, {
          toValue: tiltStrength === 0 ? 0 : Math.max(-1, Math.min(1, (tiltX * 0.8 + tiltY * 0.35) * tiltStrength)),
          friction: 8,
          tension: 95,
          useNativeDriver: true,
        }),
        Animated.spring(toyPulse, {
          toValue: tiltStrength * 0.28,
          friction: 8,
          tension: 95,
          useNativeDriver: true,
        }),
      ]).start();

      const whipStrength = magnitude - 1;
      if (whipStrength < 2.95 || now - lastShakeAtRef.current < 900) {
        return;
      }

      lastShakeAtRef.current = now;
      reactToy(true);
      setIdleHintVisible(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      playNextNote().catch(() => undefined);
    });

    DeviceMotion.setUpdateInterval(140);

    return () => subscription.remove();
  }, [gateVisible, parentPanelVisible]);

  useEffect(() => {
    if (cornerProgress.length === 0) {
      return;
    }

    if (gateTimerRef.current) {
      clearTimeout(gateTimerRef.current);
    }

    gateTimerRef.current = setTimeout(() => {
      setCornerProgress([]);
    }, 2200);

    return () => {
      if (gateTimerRef.current) {
        clearTimeout(gateTimerRef.current);
      }
    };
  }, [cornerProgress]);

  useEffect(() => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setMessageIndex((current) => (current + 1) % PLAY_MESSAGES.length);
    }, 2800);

    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, [messageIndex]);

  useEffect(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (gateVisible || parentPanelVisible) {
      setIdleHintVisible(false);
      return;
    }

    setIdleHintVisible(false);
    idleTimerRef.current = setTimeout(() => {
      setIdleHintVisible(true);
    }, 4200);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [interactionCount, gateVisible, parentPanelVisible, messageIndex]);

  const toyTransform = useMemo(
    () => [
      {
        scale: toyPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
      {
        rotate: toyRotate.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-16deg', '16deg'],
        }),
      },
    ],
    [toyPulse, toyRotate]
  );

  const auraTransform = useMemo(
    () => ({
      transform: [
        {
          scale: auraPulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1.12],
          }),
        },
      ],
      opacity: auraPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.46, 0.84],
      }),
    }),
    [auraPulse]
  );

  const playNextNote = async () => {
    const sounds = loadedSoundsRef.current;
    if (!sounds.length) {
      return;
    }

    const sound = sounds[noteIndexRef.current % sounds.length];
    noteIndexRef.current += 1;

    try {
      await sound.stopAsync().catch(() => undefined);
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      return;
    }
  };

  const spawnLegacyBurst = (x: number, y: number, bigger = false) => {
    const count = (bigger ? 10 : 6) + Math.floor(Math.random() * 4);
    const now = Date.now();
    const color = BABY_COLORS[Math.floor(Math.random() * BABY_COLORS.length)];

    const newParticles: Particle[] = [];
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * (bigger ? 3.8 : 2.6);
      newParticles.push({
        id: nextId++,
        x,
        y,
        color: index % 3 === 0 ? BABY_COLORS[Math.floor(Math.random() * BABY_COLORS.length)] : color,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: (bigger ? 24 : 18) + Math.random() * 26,
        opacity: 0.7 + Math.random() * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        born: now,
        lifetime: 850 + Math.random() * 650,
      });
    }

    const newRipple: Ripple = {
      id: nextRippleId.current++,
      x,
      y,
      color,
      born: now,
    };

    setParticles((current) => [...current.slice(-70), ...newParticles]);
    setRipples((current) => [...current.slice(-24), newRipple]);
    setBackgroundIndex((current) => (current + 1) % BACKGROUNDS.length);
  };

  const reactToy = (strong = false) => {
    toyPulse.stopAnimation();
    toyRotate.stopAnimation();
    toyPulse.setValue(0);
    toyRotate.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(toyRotate, {
          toValue: Math.random() > 0.5 ? 1 : -1,
          duration: strong ? 110 : 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(toyRotate, {
          toValue: 0,
          friction: strong ? 3.5 : 4.5,
          tension: strong ? 180 : 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(toyPulse, {
          toValue: 1,
          duration: strong ? 130 : 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(toyPulse, {
          toValue: 0,
          friction: 5,
          tension: strong ? 170 : 140,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleInteraction = (x: number, y: number) => {
    lastTouchAtRef.current = Date.now();
    lastTapAnimationAtRef.current = Date.now();
    spawnLegacyBurst(x, y, false);
    reactToy(false);
    setInteractionCount((count) => count + 1);
    setIdleHintVisible(false);
    Haptics.selectionAsync().catch(() => undefined);
    playNextNote().catch(() => undefined);
  };

  const appendDigit = (digit: string) => {
    if (pinEntry.length >= 4) {
      return;
    }

    const nextEntry = `${pinEntry}${digit}`;
    setPinEntry(nextEntry);

    if (nextEntry.length === 4) {
      setTimeout(() => {
        handlePinSubmit(nextEntry).catch(() => undefined);
      }, 120);
    }
  };

  const clearDigit = () => {
    setPinEntry((current) => current.slice(0, -1));
  };

  const resetGateState = () => {
    setPinEntry('');
    setPendingPin('');
  };

  const handlePinSubmit = async (submittedPin: string) => {
    switch (gateMode) {
      case 'setupCreate':
        setPendingPin(submittedPin);
        setPinEntry('');
        setGateMode('setupConfirm');
        setHelperText('Re-enter the passcode to confirm it.');
        return;
      case 'setupConfirm':
        if (submittedPin !== pendingPin) {
          setPinEntry('');
          setPendingPin('');
          setGateMode('setupCreate');
          setHelperText('Those codes did not match. Try a new 4-digit passcode.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
          return;
        }

        await SecureStore.setItemAsync(PASSCODE_KEY, submittedPin);
        setParentPin(submittedPin);
        setGateVisible(false);
        resetGateState();
        setGateMode('unlock');
        setHelperText('Parent passcode saved. Baby mode is ready.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        return;
      case 'unlock':
        if (submittedPin !== parentPin) {
          setPinEntry('');
          setHelperText('That passcode was incorrect.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
          return;
        }

        setPinEntry('');
        setGateVisible(false);
        setParentPanelVisible(true);
        setCornerProgress([]);
        setHelperText('Parent controls unlocked.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        return;
      case 'changeCreate':
        setPendingPin(submittedPin);
        setPinEntry('');
        setGateMode('changeConfirm');
        setHelperText('Re-enter the new passcode to save it.');
        return;
      case 'changeConfirm':
        if (submittedPin !== pendingPin) {
          setPinEntry('');
          setPendingPin('');
          setGateMode('changeCreate');
          setHelperText('Those codes did not match. Enter a new passcode again.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
          return;
        }

        await SecureStore.setItemAsync(PASSCODE_KEY, submittedPin);
        setParentPin(submittedPin);
        setPinEntry('');
        setPendingPin('');
        setGateVisible(false);
        setGateMode('unlock');
        setHelperText('Parent passcode updated.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        return;
    }
  };

  const openGate = () => {
    setPinEntry('');
    setGateVisible(true);
    setGateMode('unlock');
    setHelperText('Enter your 4-digit parent passcode.');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  };

  const startChangePinFlow = () => {
    setParentPanelVisible(false);
    setGateVisible(true);
    setGateMode('changeCreate');
    setPinEntry('');
    setPendingPin('');
    setHelperText('Enter a new 4-digit parent passcode.');
  };

  const handleCornerTap = (corner: Corner) => {
    const expected = CORNER_SEQUENCE[cornerProgress.length];
    if (corner !== expected) {
      setCornerProgress(corner === CORNER_SEQUENCE[0] ? [corner] : []);
      return;
    }

    const nextProgress = [...cornerProgress, corner];
    setCornerProgress(nextProgress);

    if (nextProgress.length === CORNER_SEQUENCE.length) {
      setCornerProgress([]);
      openGate();
    }
  };

  const backgroundStops = BACKGROUNDS[backgroundIndex];

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar hidden />
        <View style={styles.loadingCopy}>
          <Text style={styles.loadingBrand}>bambina</Text>
          <Text style={styles.loadingByline}>by openbox</Text>
          <Text style={styles.loadingDebug}>{BUILD_MARKER}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.screen}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (gateVisible || parentPanelVisible) {
          return;
        }

        const { locationX, locationY } = event.nativeEvent;
        handleInteraction(locationX, locationY);
      }}
    >
      <StatusBar hidden />

      <View style={[styles.background, { backgroundColor: backgroundStops[0] }]}>
        <View style={[styles.shape, styles.shapeOne, { backgroundColor: backgroundStops[1] }]} />
        <View style={[styles.shape, styles.shapeTwo, { backgroundColor: backgroundStops[2] }]} />
        <View style={[styles.shape, styles.shapeThree, { backgroundColor: BABY_COLORS[(backgroundIndex * 3) % BABY_COLORS.length] }]} />
        <Animated.View style={[styles.aura, auraTransform]} />
        {Array.from({ length: 10 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              {
                width: 18 + ((index * 13) % 28),
                height: 18 + ((index * 13) % 28),
                left: `${6 + ((index * 11) % 84)}%`,
                bottom: `${-2 + ((index * 7) % 46)}%`,
                backgroundColor: BABY_COLORS[index % BABY_COLORS.length],
                opacity: 0.12,
              },
            ]}
          />
        ))}
      </View>

      {ripples.map((ripple) => {
        const age = tick - ripple.born;
        const progress = Math.min(age / 600, 1);
        const size = 40 + 140 * progress;
        const opacity = 0.48 * (1 - progress);
        return (
          <View
            key={ripple.id}
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                left: ripple.x - size / 2,
                top: ripple.y - size / 2,
                opacity,
                borderColor: ripple.color,
              },
            ]}
          />
        );
      })}

      {particles.map((particle) => {
        const age = tick - particle.born;
        const progress = Math.min(age / particle.lifetime, 1);
        const opacity = particle.opacity * (1 - progress);
        const scale = 0.3 + 0.7 * Math.sin(progress * Math.PI);
        const x = particle.x + particle.vx * age * 0.001 * 80;
        const y = particle.y + particle.vy * age * 0.001 * 80 + 0.5 * 60 * (age * 0.001) ** 2;
        const rotation = progress * 260 * (particle.vx > 0 ? 1 : -1);

        if (particle.shape === 'circle') {
          return (
            <View
              key={particle.id}
              pointerEvents="none"
              style={[
                styles.circleParticle,
                {
                  left: x - particle.size / 2,
                  top: y - particle.size / 2,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.size / 2,
                  opacity,
                  backgroundColor: particle.color,
                  transform: [{ scale }, { rotate: `${rotation}deg` }],
                },
              ]}
            />
          );
        }

        const symbol = particle.shape === 'star' ? '★' : particle.shape === 'heart' ? '♥' : '▲';
        return (
          <Text
            key={particle.id}
            pointerEvents="none"
            style={[
              styles.symbolParticle,
              {
                left: x - particle.size / 2,
                top: y - particle.size / 2,
                fontSize: particle.size,
                color: particle.color,
                opacity,
                transform: [{ scale }, { rotate: `${rotation}deg` }],
              },
            ]}
          >
            {symbol}
          </Text>
        );
      })}

      <View style={styles.header}>
        <Text style={styles.badge}>{BRAND_LINE}</Text>
      </View>

      <View style={styles.centerArea}>
        <Animated.View style={[styles.toyWrapper, { transform: toyTransform }]}>
          <View style={styles.toyRingOuter}>
            <View style={styles.toyRingInner}>
              <View style={styles.toyDotLarge} />
              <View style={styles.toyDotSmall} />
              <View style={styles.toyDotTiny} />
            </View>
          </View>
          <View style={styles.handleStem} />
          <View style={styles.handleBall} />
        </Animated.View>
        {idleHintVisible && !gateVisible && !parentPanelVisible ? (
          <View style={styles.idleHint}>
            <Text style={styles.idleHintText}>{PLAY_MESSAGES[messageIndex]}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>by openbox</Text>
        <Text style={styles.footerDebug}>{BUILD_MARKER}</Text>
      </View>

      <Pressable style={[styles.cornerHotspot, styles.topLeft]} onPress={() => handleCornerTap('topLeft')} />
      <Pressable style={[styles.cornerHotspot, styles.topRight]} onPress={() => handleCornerTap('topRight')} />
      <Pressable style={[styles.cornerHotspot, styles.bottomRight]} onPress={() => handleCornerTap('bottomRight')} />
      <Pressable style={[styles.cornerHotspot, styles.bottomLeft]} onPress={() => handleCornerTap('bottomLeft')} />

      <Modal animationType="fade" transparent visible={gateVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Parent Gate</Text>
            <Text style={styles.modalTitle}>{gateModeTitle(gateMode)}</Text>
            <Text style={styles.modalBody}>{gateModeBody(gateMode)}</Text>

            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View key={index} style={[styles.pinDot, pinEntry.length > index && styles.pinDotFilled]} />
              ))}
            </View>

            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, index) => {
                if (!key) {
                  return <View key={`spacer-${index}`} style={styles.keySpacer} />;
                }

                return (
                  <Pressable
                    key={key}
                    onPress={() => (key === 'del' ? clearDigit() : appendDigit(key))}
                    style={styles.key}
                  >
                    <Text style={styles.keyText}>{key === 'del' ? 'Delete' : key}</Text>
                  </Pressable>
                );
              })}
            </View>

            {parentPin && gateMode === 'unlock' ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setGateVisible(false);
                  setPinEntry('');
                  setHelperText('Baby mode resumed.');
                }}
              >
                <Text style={styles.secondaryButtonText}>Back to baby mode</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={parentPanelVisible}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.parentCard]}>
            <Text style={styles.modalEyebrow}>Parent Controls</Text>
            <Text style={styles.modalTitle}>Baby mode is protected</Text>
            <Text style={styles.modalBody}>
              {BRAND_COMPANY} built the app-level lock in. For a true device lock, turn on Guided Access
              on iPhone or screen pinning on Android before handing the phone over.
            </Text>

            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>iPhone</Text>
              <Text style={styles.tipText}>Settings → Accessibility → Guided Access, then triple-click the side button.</Text>
            </View>
            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>Android</Text>
              <Text style={styles.tipText}>Enable screen pinning in Settings, then pin Bambina Baby Shaker from the app switcher.</Text>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                setParentPanelVisible(false);
                setHelperText('Baby mode resumed.');
              }}
            >
              <Text style={styles.primaryButtonText}>Resume baby mode</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={startChangePinFlow}>
              <Text style={styles.secondaryButtonText}>Change passcode</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function gateModeTitle(mode: GateMode) {
  switch (mode) {
    case 'setupCreate':
      return `Create the ${BRAND_LINE} parent passcode`;
    case 'setupConfirm':
      return 'Confirm the parent passcode';
    case 'unlock':
      return 'Enter the parent passcode';
    case 'changeCreate':
      return 'Choose a new passcode';
    case 'changeConfirm':
      return 'Confirm the new passcode';
  }
}

function gateModeBody(mode: GateMode) {
  switch (mode) {
    case 'setupCreate':
      return 'This 4-digit code is required before anyone can leave baby mode or change settings.';
    case 'setupConfirm':
      return 'Enter the same 4-digit code again.';
    case 'unlock':
      return 'Use your 4-digit parent code to open the hidden controls.';
    case 'changeCreate':
      return 'Enter the new 4-digit code you want to use.';
    case 'changeConfirm':
      return 'Enter that new code one more time to save it.';
  }
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7C9D4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingCopy: {
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
  },
  loadingBrand: {
    color: '#7F4F61',
    fontSize: 86,
    fontWeight: '600',
    letterSpacing: -3,
    textTransform: 'lowercase',
  },
  loadingByline: {
    color: '#9A6A7A',
    fontSize: 22,
    fontWeight: '500',
  },
  loadingDebug: {
    color: '#B27C8D',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  screen: {
    flex: 1,
    backgroundColor: '#081120',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.75,
  },
  shapeOne: {
    width: 260,
    height: 260,
    top: -40,
    left: -60,
  },
  shapeTwo: {
    width: 230,
    height: 230,
    right: -50,
    top: 120,
  },
  shapeThree: {
    width: 280,
    height: 280,
    bottom: -80,
    left: 40,
  },
  aura: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    alignSelf: 'center',
    top: '31%',
    backgroundColor: '#52D1DC66',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  ripple: {
    position: 'absolute',
    borderWidth: 3,
  },
  circleParticle: {
    position: 'absolute',
  },
  symbolParticle: {
    position: 'absolute',
    fontWeight: '800',
    includeFontPadding: false,
  },
  header: {
    paddingTop: 70,
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    color: '#081120',
    backgroundColor: '#F7F3E9',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleHint: {
    position: 'absolute',
    bottom: 54,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F7F3E9CC',
  },
  idleHintText: {
    color: '#7F4F61',
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  toyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toyRingOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F7F3E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  toyRingInner: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#FFB703',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toyDotLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F95D9B',
    position: 'absolute',
    top: 20,
    left: 18,
  },
  toyDotSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#52D1DC',
    position: 'absolute',
    bottom: 24,
    right: 18,
  },
  toyDotTiny: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#80ED99',
    position: 'absolute',
    top: 62,
    right: 26,
  },
  handleStem: {
    width: 34,
    height: 110,
    borderRadius: 18,
    backgroundColor: '#F7F3E9',
    marginTop: -16,
  },
  handleBall: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#80ED99',
    marginTop: -8,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerTitle: {
    color: '#F7F3E9AA',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  footerDebug: {
    color: '#F7F3E966',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  cornerHotspot: {
    position: 'absolute',
    width: 68,
    height: 68,
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#030712CC',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#F7F3E9',
    borderRadius: 28,
    padding: 24,
    gap: 18,
  },
  parentCard: {
    gap: 16,
  },
  modalEyebrow: {
    color: '#F95D9B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: '#081120',
    fontSize: 28,
    fontWeight: '800',
  },
  modalBody: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 22,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  pinDotFilled: {
    backgroundColor: '#081120',
    borderColor: '#081120',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  key: {
    width: 84,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: '#081120',
    fontSize: 22,
    fontWeight: '700',
  },
  keySpacer: {
    width: 84,
    height: 60,
  },
  primaryButton: {
    backgroundColor: '#081120',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '700',
  },
  tipBlock: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  tipTitle: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '800',
  },
  tipText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 20,
  },
});
