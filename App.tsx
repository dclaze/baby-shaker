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
  LayoutChangeEvent,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
type GateMode = 'setupCreate' | 'setupConfirm' | 'unlock' | 'changeCreate' | 'changeConfirm';
type Shape = 'circle' | 'star' | 'heart' | 'triangle';
type SoundPackId = 'chime' | 'twinkle' | 'rattle';
type JourneyStep = {
  title: string;
  body: string;
};
type SoundPack = {
  id: SoundPackId;
  label: string;
  shortLabel: string;
  description: string;
  files: number[];
};

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
const BUILD_MARKER = 'v0.1.0-dev.20260328-1341';
const PASSCODE_KEY = 'openbox-bambina-parent-passcode';
const SINGLE_APP_GUIDE_ACK_KEY = 'openbox-bambina-single-app-guide-acknowledged';
const SOUND_PACK_KEY = 'openbox-bambina-sound-pack';
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
  'listen for the sound',
];
const SHAPES: Shape[] = ['circle', 'star', 'heart', 'triangle'];
const BACKGROUNDS = [
  ['#1A0533', '#0D1B4D', '#001A33'],
  ['#1A2500', '#002233', '#1A0022'],
  ['#220033', '#001A22', '#002200'],
  ['#002244', '#220000', '#001122'],
];
const SOUND_PACKS: SoundPack[] = [
  {
    id: 'chime',
    label: 'Bell Chimes',
    shortLabel: 'Chimes',
    description: 'Bright little notes that climb upward with each shake.',
    files: [
      require('./assets/audio/c4.wav'),
      require('./assets/audio/d4.wav'),
      require('./assets/audio/e4.wav'),
      require('./assets/audio/f4.wav'),
      require('./assets/audio/g4.wav'),
      require('./assets/audio/a4.wav'),
      require('./assets/audio/b4.wav'),
      require('./assets/audio/c5.wav'),
    ],
  },
  {
    id: 'twinkle',
    label: 'Twinkle Drops',
    shortLabel: 'Twinkle',
    description: 'Dreamier sparkles with a gentler, less straight-line melody.',
    files: [
      require('./assets/audio/c5.wav'),
      require('./assets/audio/g4.wav'),
      require('./assets/audio/e4.wav'),
      require('./assets/audio/a4.wav'),
      require('./assets/audio/f4.wav'),
      require('./assets/audio/d4.wav'),
      require('./assets/audio/b4.wav'),
      require('./assets/audio/c4.wav'),
    ],
  },
  {
    id: 'rattle',
    label: 'Classic Rattle',
    shortLabel: 'Rattle',
    description: 'Soft clacks and tiny shaker textures for a more classic toy feel.',
    files: [
      require('./assets/audio/rattle-soft.wav'),
      require('./assets/audio/rattle-bright.wav'),
      require('./assets/audio/rattle-clack.wav'),
      require('./assets/audio/rattle-soft.wav'),
      require('./assets/audio/rattle-clack.wav'),
      require('./assets/audio/rattle-bright.wav'),
    ],
  },
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
  const [singleAppGuideVisible, setSingleAppGuideVisible] = useState(false);
  const [launchPromptVisible, setLaunchPromptVisible] = useState(false);
  const [singleAppGuideAcknowledged, setSingleAppGuideAcknowledged] = useState(false);
  const [selectedSoundPack, setSelectedSoundPack] = useState<SoundPackId>('chime');
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [exitStepsConfirmed, setExitStepsConfirmed] = useState(false);
  const [systemLockConfirmed, setSystemLockConfirmed] = useState(false);
  const [nativeLimitsConfirmed, setNativeLimitsConfirmed] = useState(false);
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
  const lastShakeAtRef = useRef(0);
  const shakeEnergyRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedSoundsRef = useRef<Audio.Sound[]>([]);
  const screenOriginRef = useRef({ x: 0, y: 0 });
  const toyRotate = useRef(new Animated.Value(0)).current;
  const toyPulse = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const [savedPin, savedGuideAck, savedSoundPack] = await Promise.all([
          SecureStore.getItemAsync(PASSCODE_KEY),
          SecureStore.getItemAsync(SINGLE_APP_GUIDE_ACK_KEY),
          SecureStore.getItemAsync(SOUND_PACK_KEY),
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
          setSingleAppGuideAcknowledged(savedGuideAck === 'yes');
          if (savedSoundPack === 'chime' || savedSoundPack === 'twinkle' || savedSoundPack === 'rattle') {
            setSelectedSoundPack(savedSoundPack);
          }
          setLaunchPromptVisible(savedGuideAck !== 'yes');
          setHelperText('Clockwise corner taps open the parent gate.');
        } else {
          setParentPin(null);
          setGateMode('setupCreate');
          setGateVisible(true);
          setLaunchPromptVisible(false);
          setSingleAppGuideAcknowledged(false);
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
      const pack = SOUND_PACKS.find((entry) => entry.id === selectedSoundPack) ?? SOUND_PACKS[0];
      for (const file of pack.files) {
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false });
        sounds.push(sound);
      }
      if (active) {
        const previousSounds = loadedSoundsRef.current;
        loadedSoundsRef.current = sounds;
        noteIndexRef.current = 0;
        await Promise.all(previousSounds.map((sound) => sound.unloadAsync().catch(() => undefined)));
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
  }, [selectedSoundPack]);

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
      if (!parentPanelVisible && !singleAppGuideVisible) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        setHelperText('Parent gate: tap the four corners clockwise.');
        return true;
      }

      if (singleAppGuideVisible) {
        setSingleAppGuideVisible(false);
        setParentPanelVisible(true);
        setHelperText('Returned to parent controls.');
        return true;
      }

      setParentPanelVisible(false);
      setHelperText('Baby mode resumed.');
      return true;
    });

    return () => subscription.remove();
  }, [parentPanelVisible, singleAppGuideVisible]);

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
      if (!motion.accelerationIncludingGravity || gateVisible || parentPanelVisible || singleAppGuideVisible) {
        return;
      }

      const now = Date.now();
      const { x = 0, y = 0 } = motion.accelerationIncludingGravity;
      const linearAcceleration = motion.acceleration ?? { x: 0, y: 0, z: 0 };
      const linearX = linearAcceleration.x ?? 0;
      const linearY = linearAcceleration.y ?? 0;
      const linearZ = linearAcceleration.z ?? 0;
      const linearMagnitude = Math.sqrt(linearX * linearX + linearY * linearY + linearZ * linearZ);
      const tiltX = Math.max(-1, Math.min(1, x / 4.2));
      const tiltY = Math.max(-1, Math.min(1, y / 4.2));
      const rawTiltStrength = Math.min(1, Math.sqrt(tiltX * tiltX + tiltY * tiltY));
      const tiltStrength = rawTiltStrength < 0.12 ? 0 : (rawTiltStrength - 0.12) / 0.88;
      const nextShakeEnergy = shakeEnergyRef.current * 0.58 + linearMagnitude * 0.42;
      shakeEnergyRef.current = nextShakeEnergy;
      const motionPulse = Math.min(1, nextShakeEnergy / 2.8);

      Animated.parallel([
        Animated.spring(toyRotate, {
          toValue: tiltStrength === 0 ? 0 : Math.max(-1, Math.min(1, (tiltX * 0.8 + tiltY * 0.35) * tiltStrength)),
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(toyPulse, {
          toValue: Math.min(0.42, tiltStrength * 0.18 + motionPulse * 0.24),
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();

      const strongShake = nextShakeEnergy >= 2.3;
      const mediumShake = nextShakeEnergy >= 1.45;
      const cooldown = strongShake ? 220 : 320;
      if ((!mediumShake && !strongShake) || now - lastShakeAtRef.current < cooldown) {
        return;
      }

      lastShakeAtRef.current = now;
      reactToy(strongShake);
      setInteractionCount((count) => count + 1);
      setIdleHintVisible(false);
      Haptics.impactAsync(strongShake ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      playNextNote().catch(() => undefined);
    });

    DeviceMotion.setUpdateInterval(80);

    return () => subscription.remove();
  }, [gateVisible, parentPanelVisible, singleAppGuideVisible]);

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

    if (gateVisible || parentPanelVisible || singleAppGuideVisible) {
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
  }, [interactionCount, gateVisible, parentPanelVisible, singleAppGuideVisible, messageIndex]);

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

  const resetSingleAppChecklist = () => {
    setExitStepsConfirmed(false);
    setSystemLockConfirmed(singleAppGuideAcknowledged);
    setNativeLimitsConfirmed(false);
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
        setLaunchPromptVisible(false);
        setSingleAppGuideAcknowledged(false);
        resetSingleAppChecklist();
        setSingleAppGuideVisible(true);
        setHelperText('Review the single-app play steps before handing the phone over.');
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
    setSingleAppGuideVisible(false);
    setSoundPickerOpen(false);
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

  const handleScreenLayout = (event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;
    screenOriginRef.current = { x, y };
  };

  const backgroundStops = BACKGROUNDS[backgroundIndex];
  const activeSoundPack = SOUND_PACKS.find((entry) => entry.id === selectedSoundPack) ?? SOUND_PACKS[0];
  const singleAppGuideMode = singleAppGuideAcknowledged ? 'quickStart' : 'firstTime';
  const canStartSingleAppPlay =
    singleAppGuideMode === 'quickStart'
      ? exitStepsConfirmed && systemLockConfirmed
      : exitStepsConfirmed && systemLockConfirmed && nativeLimitsConfirmed;
  const singleAppSetupTitle =
    Platform.OS === 'ios'
      ? singleAppGuideMode === 'quickStart'
        ? 'Start Guided Access for handoff'
        : 'Set up Guided Access for this iPhone'
      : singleAppGuideMode === 'quickStart'
        ? 'Pin Baby Shaker for handoff'
        : 'Set up app pinning for this Android phone';
  const singleAppSetupBody =
    Platform.OS === 'ios'
      ? singleAppGuideMode === 'quickStart'
        ? `Your one-time Guided Access setup is marked complete on this iPhone. Right before handoff, start Guided Access from ${APP_NAME} and the phone stays in this app until you exit.`
        : `${APP_NAME} can lock its own parent controls, but iPhone buttons and system gestures still belong to iOS until Guided Access is enabled once on this device.`
      : singleAppGuideMode === 'quickStart'
        ? `Your one-time app pinning setup is marked complete on this phone. Right before handoff, pin ${APP_NAME} from the app switcher so Android stays inside this app.`
        : `${APP_NAME} can lock its own parent controls, but Android navigation still belongs to the phone until app pinning is turned on once and then used before handoff.`;
  const exitJourney =
    Platform.OS === 'ios'
      ? 'To exit later: triple-click the side button, then enter the Guided Access passcode or use Face ID / Touch ID if you enabled it.'
      : 'To exit later: use your phone’s unpin gesture, then enter the device PIN, pattern, or password if Android asks for it.';
  const systemJourney =
    Platform.OS === 'ios'
      ? 'One-time setup lives in Settings → Accessibility → Guided Access. After that, you start it from inside Baby Shaker with a triple-click of the side or Home button.'
      : 'One-time setup lives in Settings → Security → App pinning on most phones. After that, you pin Baby Shaker from the Android app switcher right before handoff.';
  const singleAppPrimaryActionLabel =
    Platform.OS === 'ios'
      ? 'I already enabled Guided Access on this iPhone'
      : 'I already enabled app pinning on this phone';
  const singleAppActionHint =
    Platform.OS === 'ios'
      ? 'Apple does not let this app open Guided Access settings or confirm that Guided Access is active, so this step still needs a parent.'
      : 'Android can open Security settings, but only the parent can finish the final pin step from the system overview screen.';
  const journeySteps: JourneyStep[] =
    Platform.OS === 'ios'
      ? singleAppGuideMode === 'quickStart'
        ? [
            {
              title: 'Open Baby Shaker and get ready',
              body: 'Keep Baby Shaker on screen before handoff.',
            },
            {
              title: 'Triple-click the side button',
              body: 'If the Accessibility Shortcuts panel appears, tap Guided Access, then tap Start.',
            },
            {
              title: 'Hand the phone over',
              body: `When it is time to stop, ${exitJourney}`,
            },
          ]
        : [
            {
              title: 'Turn on Guided Access once',
              body: 'Open Settings, go to Accessibility, choose Guided Access, and turn it on.',
            },
            {
              title: 'Choose how you will exit later',
              body: 'Set a Guided Access passcode and optionally enable Face ID or Touch ID for ending sessions faster.',
            },
            {
              title: 'Start it from Baby Shaker at handoff time',
              body: 'Return to Baby Shaker, triple-click the side or Home button, choose Guided Access if needed, then tap Start.',
            },
          ]
      : singleAppGuideMode === 'quickStart'
        ? [
            {
              title: 'Keep Baby Shaker open',
              body: 'Bring up the app switcher while Baby Shaker is already on screen.',
            },
            {
              title: 'Pin the app from overview',
              body: 'Tap the Baby Shaker app icon in overview, then tap Pin.',
            },
            {
              title: 'Hand the phone over',
              body: `When it is time to stop, ${exitJourney}`,
            },
          ]
        : [
            {
              title: 'Turn on app pinning once',
              body: 'Open Security settings and turn on App pinning or Screen pinning. If offered, require the device PIN, pattern, or password before unpinning.',
            },
            {
              title: 'Return to Baby Shaker',
              body: 'Come back here after settings are ready so future handoffs are faster.',
            },
            {
              title: 'Pin Baby Shaker before handoff',
              body: 'Open overview, tap the Baby Shaker app icon, then tap Pin.',
            },
          ];

  const openSingleAppGuide = () => {
    setParentPanelVisible(false);
    setLaunchPromptVisible(false);
    setSoundPickerOpen(false);
    resetSingleAppChecklist();
    setSingleAppGuideVisible(true);
    setHelperText('Single-app play setup is open.');
  };

  const openAndroidPinningSettings = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await Linking.sendIntent('android.settings.SECURITY_SETTINGS');
      setHelperText('Android Security settings opened.');
    } catch {
      try {
        await Linking.sendIntent('android.settings.SETTINGS');
        setHelperText('Android Settings opened.');
      } catch {
        setHelperText('Could not open Android settings automatically on this device.');
      }
    }
  };

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
      setHelperText('App settings opened.');
    } catch {
      setHelperText('Could not open settings automatically on this device.');
    }
  };

  const completeSingleAppGuide = async () => {
    await SecureStore.setItemAsync(SINGLE_APP_GUIDE_ACK_KEY, 'yes');
    setSingleAppGuideAcknowledged(true);
    setSingleAppGuideVisible(false);
    setHelperText(
      Platform.OS === 'ios'
        ? 'Baby mode resumed. Triple-click the side button to start Guided Access before handoff.'
        : 'Baby mode resumed. Pin Baby Shaker from Android overview before handoff.'
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const returnToParentControls = () => {
    setSingleAppGuideVisible(false);
    setSoundPickerOpen(false);
    setParentPanelVisible(true);
    setHelperText('Returned to parent controls.');
  };

  const dismissLaunchPrompt = () => {
    setLaunchPromptVisible(false);
    setHelperText('Baby mode resumed. Use the settings button when you are ready to lock the app for handoff.');
  };

  const chooseSoundPack = async (soundPackId: SoundPackId) => {
    const nextPack = SOUND_PACKS.find((entry) => entry.id === soundPackId) ?? SOUND_PACKS[0];
    setSelectedSoundPack(nextPack.id);
    setSoundPickerOpen(false);
    noteIndexRef.current = 0;
    setHelperText(`${nextPack.label} selected.`);
    await SecureStore.setItemAsync(SOUND_PACK_KEY, nextPack.id);
    setTimeout(() => {
      playNextNote().catch(() => undefined);
    }, 120);
  };

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
      onLayout={handleScreenLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        if (gateVisible || parentPanelVisible || singleAppGuideVisible) {
          return;
        }

        const { pageX, pageY } = event.nativeEvent;
        const localX = pageX - screenOriginRef.current.x;
        const localY = pageY - screenOriginRef.current.y;
        handleInteraction(localX, localY);
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
        <Text style={styles.badge}>{APP_NAME.toLowerCase()}</Text>
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
        <Text style={styles.footerTitle}>{`${BRAND_LINE.toLowerCase()} by ${BRAND_COMPANY.toLowerCase()}`}</Text>
        <Text style={styles.footerDebug}>{BUILD_MARKER}</Text>
      </View>

      {parentPin && !gateVisible && !parentPanelVisible && !singleAppGuideVisible ? (
        <Pressable
          style={styles.settingsFab}
          onPress={openGate}
          accessibilityRole="button"
          accessibilityLabel="Open parent settings"
        >
          <Text style={styles.settingsFabIcon}>⚙</Text>
        </Pressable>
      ) : null}

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
                  setSoundPickerOpen(false);
                  setHelperText('Baby mode resumed.');
                }}
              >
                <Text style={styles.secondaryButtonText}>Back to baby mode</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={launchPromptVisible && !gateVisible && !singleAppGuideVisible}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.launchPromptCard]}>
            <Text style={styles.modalEyebrow}>Parent Setup</Text>
            <Text style={styles.modalTitle}>Set up single-app play?</Text>
            <Text style={styles.modalBody}>
              {Platform.OS === 'ios'
                ? `Before handoff, set up Guided Access on this iPhone so ${APP_NAME} can stay on screen.`
                : `Before handoff, set up app pinning on this Android phone so ${APP_NAME} can stay on screen.`}
            </Text>

            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>Why this shows now</Text>
              <Text style={styles.tipText}>
                This appears until a parent reviews the single-app play setup once. After that, use the settings button in the bottom corner any time you want to revisit it.
              </Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={openSingleAppGuide}>
              <Text style={styles.primaryButtonText}>Set up now</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={dismissLaunchPrompt}>
              <Text style={styles.secondaryButtonText}>Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={parentPanelVisible}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.parentCard]}>
            <Text style={styles.modalEyebrow}>Parent Controls</Text>
            <Text style={styles.modalTitle}>Baby mode is protected</Text>
            <Text style={styles.modalBody}>
              {BRAND_COMPANY} built the app-level lock in. Use the single-app play setup before handoff so the baby stays in {APP_NAME}.
            </Text>

            <View style={styles.tipBlock}>
              <Text style={styles.tipTitle}>Single-app play</Text>
              <Text style={styles.tipText}>
                {singleAppGuideAcknowledged
                  ? 'This device is marked as ready for quick lock. Open the guided handoff flow any time you want the exact lock and exit steps again.'
                  : 'Walk through the guided setup once on this device, then future handoffs become much faster.'}
              </Text>
            </View>

            <View style={styles.soundCard}>
              <Text style={styles.tipTitle}>Sound pack</Text>
              <Text style={styles.tipText}>{activeSoundPack.description}</Text>

              <Pressable
                style={[styles.soundDropdown, soundPickerOpen && styles.soundDropdownOpen]}
                onPress={() => setSoundPickerOpen((current) => !current)}
              >
                <View style={styles.soundDropdownCopy}>
                  <Text style={styles.soundDropdownLabel}>{activeSoundPack.label}</Text>
                  <Text style={styles.soundDropdownHint}>Tap to choose a different toy sound</Text>
                </View>
                <Text style={styles.soundDropdownChevron}>{soundPickerOpen ? '▲' : '▼'}</Text>
              </Pressable>

              {soundPickerOpen ? (
                <View style={styles.soundOptions}>
                  {SOUND_PACKS.map((soundPack) => (
                    <Pressable
                      key={soundPack.id}
                      style={[styles.soundOption, soundPack.id === activeSoundPack.id && styles.soundOptionActive]}
                      onPress={() => {
                        chooseSoundPack(soundPack.id).catch(() => undefined);
                      }}
                    >
                      <View style={styles.soundOptionCopy}>
                        <Text style={styles.soundOptionTitle}>
                          {soundPack.label}
                          {soundPack.id === activeSoundPack.id ? ' selected' : ''}
                        </Text>
                        <Text style={styles.soundOptionBody}>{soundPack.description}</Text>
                      </View>
                      <Text style={styles.soundOptionBadge}>{soundPack.shortLabel}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <Pressable style={styles.primaryButton} onPress={openSingleAppGuide}>
              <Text style={styles.primaryButtonText}>{singleAppGuideAcknowledged ? 'Review single-app play' : 'Set up single-app play'}</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setParentPanelVisible(false);
                setSoundPickerOpen(false);
                setHelperText('Baby mode resumed.');
              }}
            >
              <Text style={styles.secondaryButtonText}>Resume baby mode</Text>
            </Pressable>

            <Pressable style={styles.tertiaryButton} onPress={startChangePinFlow}>
              <Text style={styles.tertiaryButtonText}>Change passcode</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={singleAppGuideVisible}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.parentCard, styles.singleAppCard]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.singleAppScroll}>
              <Text style={styles.modalEyebrow}>Single-App Play</Text>
              <Text style={styles.modalTitle}>{singleAppSetupTitle}</Text>
              <Text style={styles.modalBody}>{singleAppSetupBody}</Text>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>{singleAppGuideMode === 'quickStart' ? 'Fastest journey now' : 'Best setup journey'}</Text>
                <Text style={styles.tipText}>{systemJourney}</Text>
              </View>

              {journeySteps.map((step, index) => (
                <View key={`${step.title}-${index}`} style={styles.journeyStep}>
                  <View style={styles.journeyBadge}>
                    <Text style={styles.journeyBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.journeyCopy}>
                    <Text style={styles.journeyTitle}>{step.title}</Text>
                    <Text style={styles.journeyBody}>{step.body}</Text>
                  </View>
                </View>
              ))}

              <View style={[styles.tipBlock, styles.warningBlock]}>
                <Text style={styles.tipTitle}>Exit this mode first</Text>
                <Text style={styles.tipText}>{exitJourney}</Text>
              </View>

              <View style={styles.tipBlock}>
                <Text style={styles.tipTitle}>Native limit</Text>
                <Text style={styles.tipText}>{singleAppActionHint}</Text>
              </View>

              {Platform.OS === 'android' ? (
                <Pressable style={styles.primaryButton} onPress={openAndroidPinningSettings}>
                  <Text style={styles.primaryButtonText}>Open Security settings</Text>
                </Pressable>
              ) : (
                <View style={styles.tipBlock}>
                  <Text style={styles.tipTitle}>One-tap limitation on iPhone</Text>
                  <Text style={styles.tipText}>
                    Apple does not expose a public deep link into Guided Access settings. The fastest reliable flow is to set it up once in Settings, then start it with the hardware button shortcut from inside Baby Shaker.
                  </Text>
                </View>
              )}

              <Pressable
                style={[styles.checkRow, exitStepsConfirmed && styles.checkRowActive]}
                onPress={() => setExitStepsConfirmed((current) => !current)}
              >
                <Text style={styles.checkIcon}>{exitStepsConfirmed ? '✓' : '○'}</Text>
                <Text style={styles.checkText}>I know exactly how to exit this mode later.</Text>
              </Pressable>

              <Pressable
                style={[styles.checkRow, systemLockConfirmed && styles.checkRowActive]}
                onPress={() => setSystemLockConfirmed((current) => !current)}
              >
                <Text style={styles.checkIcon}>{systemLockConfirmed ? '✓' : '○'}</Text>
                <Text style={styles.checkText}>
                  {singleAppGuideMode === 'quickStart'
                    ? `I am ready to ${Platform.OS === 'ios' ? 'start Guided Access' : 'pin Baby Shaker'} right before handoff.`
                    : singleAppPrimaryActionLabel}
                </Text>
              </Pressable>

              {singleAppGuideMode === 'firstTime' ? (
                <Pressable
                  style={[styles.checkRow, nativeLimitsConfirmed && styles.checkRowActive]}
                  onPress={() => setNativeLimitsConfirmed((current) => !current)}
                >
                  <Text style={styles.checkIcon}>{nativeLimitsConfirmed ? '✓' : '○'}</Text>
                  <Text style={styles.checkText}>
                    I understand the app cannot verify the native lock state automatically.
                  </Text>
                </Pressable>
              ) : null}

              {Platform.OS === 'ios' ? (
                <Pressable style={styles.secondaryButton} onPress={openAppSettings}>
                  <Text style={styles.secondaryButtonText}>Open Baby Shaker settings</Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <Pressable
              style={[styles.primaryButton, !canStartSingleAppPlay && styles.primaryButtonDisabled]}
              disabled={!canStartSingleAppPlay}
              onPress={() => {
                completeSingleAppGuide().catch(() => undefined);
              }}
            >
              <Text style={styles.primaryButtonText}>
                {singleAppGuideMode === 'quickStart' ? 'Resume and lock now' : 'Save setup and resume'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={returnToParentControls}>
              <Text style={styles.secondaryButtonText}>Back to parent controls</Text>
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
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
  settingsFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F7F3E9EE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  settingsFabIcon: {
    color: '#081120',
    fontSize: 24,
    fontWeight: '800',
    includeFontPadding: false,
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
  launchPromptCard: {
    gap: 16,
  },
  singleAppCard: {
    maxHeight: '88%',
  },
  singleAppScroll: {
    gap: 14,
    paddingBottom: 8,
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
  tertiaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  tipBlock: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  soundCard: {
    backgroundColor: '#FFF4D8',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F6C453',
  },
  soundDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#FBCB64',
  },
  soundDropdownOpen: {
    borderColor: '#081120',
  },
  soundDropdownCopy: {
    flex: 1,
    gap: 2,
  },
  soundDropdownLabel: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '800',
  },
  soundDropdownHint: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  soundDropdownChevron: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '800',
  },
  soundOptions: {
    gap: 10,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFFCC',
    borderWidth: 1,
    borderColor: '#F6D58A',
  },
  soundOptionActive: {
    borderColor: '#081120',
    backgroundColor: '#FFFFFF',
  },
  soundOptionCopy: {
    flex: 1,
    gap: 4,
  },
  soundOptionTitle: {
    color: '#081120',
    fontSize: 15,
    fontWeight: '800',
  },
  soundOptionBody: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  soundOptionBadge: {
    color: '#7C2D12',
    backgroundColor: '#FDE68A',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
  },
  journeyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  journeyBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#081120',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  journeyBadgeText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  journeyCopy: {
    flex: 1,
    gap: 4,
  },
  journeyTitle: {
    color: '#081120',
    fontSize: 16,
    fontWeight: '800',
  },
  journeyBody: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  warningBlock: {
    backgroundColor: '#FDE68A',
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  checkRowActive: {
    borderColor: '#081120',
    backgroundColor: '#E0F2FE',
  },
  checkIcon: {
    color: '#081120',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  checkText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
