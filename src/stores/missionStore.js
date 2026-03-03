import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import AudioManager from '../audio/AudioManager'

export const useMissionStore = create(
  persist(
    subscribeWithSelector((set) => ({
      // Estado general
      phase: 'Pre-launch',
      currentScene: 'KSC_EXPLORATION', // Start at Kennedy Space Center exploration
      met: 0,
      altitude: 0,
      velocity: 0,
      fuel: 100,
      throttle: 0,
      ignited: false,
      currentStage: 0,
      inOrbit: false,
      onTranslunar: false,
      lunarOrbit: false, // NEW: Orbiting the Moon
      lunarDescent: false,
      landed: false,
      ascent: false,
      isExploring: false,
      docked: false,
      onTransEarth: false,
      reentry: false,
      reentryPhase: 'INITIAL', // Track reentry phase for cabin view sync
      splashed: false,
      crashed: false,
      lmDocked: false,
      lunarApproach: false,
      isFreeReturn: false,
      waitingForIgnition: false,
      launchDay: true,
      parachutesDeployed: false,

      // Stage separation tracking (for realistic rocket disassembly)
      stageSeparations: [], // Array of { stage, altitude, time }
      lesJettisoned: false, // Launch Escape System jettisoned
      interstageVisible: false,

      // Earth orbit tracking
      earthOrbitsCompleted: 0,
      earthOrbitTarget: 1.5, // Apollo 11 did ~1.5 orbits

      // Lunar orbit tracking
      lunarOrbitsCompleted: 0,
      lmSeparatedFromCSM: false,

      // UI / View State
      cameraMode: 'external',

      // Cabin Systems
      cabinLights: true,
      oxygenLevel: 100,
      powerLevel: 100,
      masterAlarm: false,
      heatShield: false,
      isDaySide: true,
      aborted: false,
      countdown: null,
      isLaunching: false,
      tutorialStep: 0,
      isTutorialActive: !localStorage.getItem('apollo11_tutorial_completed'),
      timeWarp: 1,
      isLookingBack: false,
      showPhaseMessage: true,
      hudVisible: true,
      instruction: { text: '', visible: false },

      setValues: (obj) => set((state) => ({ ...state, ...obj })),
      setShowPhaseMessage: (val) => set({ showPhaseMessage: val }),
      setInstruction: (text) => {
        set({ instruction: { text, visible: true } });
        setTimeout(() => set({ instruction: { text: '', visible: false } }), 7000);
      },
      toggleLookBack: () => set(state => ({ isLookingBack: !state.isLookingBack })),
      toggleHud: () => set(state => ({ hudVisible: !state.hudVisible })),
      nextTutorialStep: () => set(state => ({ tutorialStep: state.tutorialStep + 1 })),


      clearAllPhases: () => set({
        currentScene: 'LAUNCH',
        inOrbit: false,
        onTranslunar: false,
        lunarOrbit: false,
        lunarDescent: false,
        landed: false,
        ascent: false,
        isExploring: false,
        docked: false,
        onTransEarth: false,
        reentry: false,
        splashed: false,
        aborted: false,
        crashed: false,
        lunarApproach: false,
        waitingForIgnition: false,
        ignited: false,
        throttle: 0,
        velocity: 0,
        masterAlarm: false,
        parachutesDeployed: false,
        lmSeparatedFromCSM: false
      }),

      startCountdown: () => {
        set({ isLaunching: true, countdown: 10, phase: 'Pre-launch' });

        // Iniciar el reloj de la misión (MET) y consumo de recursos
        const metInterval = setInterval(() => {
          set((state) => {
            if (state.crashed || state.splashed || state.aborted) {
              clearInterval(metInterval);
              return state;
            }
            const newOxygen = Math.max(0, state.oxygenLevel - 0.005);
            const newPower = Math.max(0, state.powerLevel - 0.003);
            const fuelLow = state.fuel < 10 && state.fuel > 0;
            const resourcesLow = newOxygen < 15 || newPower < 15;

            if ((fuelLow || resourcesLow) && !state.masterAlarm) {
              AudioManager.playAlarm();
              set({ masterAlarm: true });
            }
            return { met: state.met + 1, oxygenLevel: newOxygen, powerLevel: newPower };
          });
        }, 1000);

        const interval = setInterval(() => {
          set((state) => {
            if (state.countdown === 1) {
              clearInterval(interval);
              return { countdown: 0, ignited: true, phase: 'Liftoff!' };
            }
            return { countdown: state.countdown - 1 };
          });
        }, 1000);
      },

      // Stage separation with tracking
      nextStage: () => set((state) => {
        AudioManager.playStageSep();
        const newSep = [...state.stageSeparations, {
          stage: state.currentStage,
          altitude: state.altitude,
          time: state.met
        }];

        // LES jettisons with stage 1 or at ~90km
        const lesJettison = state.currentStage >= 1 || state.altitude > 90000;

        return {
          currentStage: state.currentStage + 1,
          fuel: 100,
          phase: state.currentStage === 0
            ? 'S-IC SEP — S-II IGNITION'
            : state.currentStage === 1
              ? 'S-II SEP — S-IVB IGNITION'
              : `Stage ${state.currentStage + 1} Ignition`,
          stageSeparations: newSep,
          lesJettisoned: lesJettison
        };
      }),

      startOrbit: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'EARTH_ORBIT',
          inOrbit: true,
          phase: 'Parking Orbit — 185 KM',
          earthOrbitsCompleted: 0,
          lesJettisoned: true
        });
        AudioManager.playStageSep();
        AudioManager.startAmbient('space');
      },

      startTLI: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'TRANSLUNAR',
          onTranslunar: true,
          phase: 'Trans-Lunar Injection — S-IVB BURN',
          velocity: 1.5
        });
        AudioManager.playClick();
        AudioManager.startAmbient('space');
      },

      // NEW: Lunar Orbit Insertion (between Translunar and Descent)
      startLunarOrbit: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'LUNAR_ORBIT',
          lunarOrbit: true,
          phase: 'Lunar Orbit Insertion — LOI BURN',
          velocity: 1.6,
          lunarOrbitsCompleted: 0,
          lmSeparatedFromCSM: false
        });
        AudioManager.playStageSep();
        AudioManager.startAmbient('space');
      },

      startFreeReturn: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'TRANSEARTH',
          onTransEarth: true,
          phase: 'FREE RETURN TRAJECTORY',
          isFreeReturn: true,
          velocity: 1.2
        });
        AudioManager.playClick();
        AudioManager.startAmbient('space');
      },

      startDescent: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'LUNAR_DESCENT',
          lunarDescent: true,
          phase: 'Powered Descent — PDI',
          altitude: 15000,
          velocity: 0,
          fuel: 150,
          ignited: true
        });
        AudioManager.startAmbient('cabin');
      },

      landSuccess: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({ currentScene: 'LUNAR_SURFACE', landed: true, phase: 'The Eagle has landed!' });
        // Play success fanfare FIRST
        AudioManager.playSuccess();
        // Wait 3 seconds, then start quiet lunar ambient (replaces the fanfare naturally)
        setTimeout(() => {
          AudioManager.startAmbient('lunar');
        }, 3000);
      },

      startAscent: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'LUNAR_ASCENT',
          ascent: true,
          phase: 'Lunar Liftoff — Rendezvous with Collins',
          altitude: 1,
          velocity: 0,
          fuel: 100,
          throttle: 1,
          waitingForIgnition: true
        });
        AudioManager.startAmbient('cabin');
      },

      dockSuccess: () => {
        set({ docked: true, phase: 'Docking complete — Welcome back, crew!' });
        AudioManager.playDock();
      },

      startTEI: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'TRANSEARTH',
          onTransEarth: true,
          phase: 'Trans-Earth Injection — HEADING HOME',
          velocity: 10.9,
          fuel: 100
        });
        AudioManager.startAmbient('space');
      },

      startReentry: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'REENTRY',
          reentry: true,
          phase: 'Re-entry Interface — 120 KM',
          altitude: 120
        });
        AudioManager.startAmbient('reentry');
      },

      splashdown: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({ currentScene: 'SPLASHDOWN', splashed: true, phase: 'WELCOME HOME, APOLLO 11' });
        AudioManager.playSplash();
        AudioManager.playSuccess();
      },

      crash: () => {
        AudioManager.stopAll();
        set({ crashed: true, phase: 'MISSION FAILURE' });
        AudioManager.playAlarm();
      },

      abortMission: () => {
        AudioManager.stopAll();
        set({ aborted: true, phase: 'MISSION ABORTED', masterAlarm: true });
        AudioManager.playAbort();
      },

      resetMission: () => {
        AudioManager.stopAll();
        localStorage.removeItem('apollo11-mission-state');
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({
          currentScene: 'KSC_EXPLORATION',
          phase: 'Pre-launch',
          met: 0,
          altitude: 0,
          velocity: 0,
          fuel: 100,
          throttle: 0,
          ignited: false,
          currentStage: 0,
          oxygenLevel: 100,
          powerLevel: 100,
          masterAlarm: false,
          heatShield: false,
          isDaySide: true,
          countdown: null,
          isLaunching: false,
          timeWarp: 1,
          isLookingBack: false,
          showPhaseMessage: true,
          instruction: { text: '', visible: false },
          stageSeparations: [],
          lesJettisoned: false,
          interstageVisible: false,
          earthOrbitsCompleted: 0,
          lunarOrbitsCompleted: 0,
          lmSeparatedFromCSM: false,
          lmDocked: false,
          lunarApproach: false,
          isFreeReturn: false,
          launchDay: true,
          parachutesDeployed: false,
          reentryPhase: 'INITIAL',
          hudVisible: true,
        });
        AudioManager.startAmbient('launch');
      },

      toggleCamera: () => set(state => {
        const newMode = state.cameraMode === 'external' ? 'cabin' : 'external'
        // Re-ensure ambient audio is playing (fixes audio disappearing on cabin toggle)
        setTimeout(() => {
          const scene = useMissionStore.getState().currentScene
          if (['EARTH_ORBIT', 'TRANSLUNAR', 'TRANSEARTH', 'LUNAR_ORBIT'].includes(scene)) AudioManager.startAmbient('space')
          else if (['LUNAR_SURFACE', 'LUNAR_EXPLORATION'].includes(scene)) AudioManager.startAmbient('lunar')
          else if (scene === 'REENTRY') AudioManager.startAmbient('reentry')
          else if (['LUNAR_DESCENT', 'LUNAR_ASCENT'].includes(scene)) AudioManager.startAmbient('cabin')
          else if (scene === 'LAUNCH') AudioManager.startAmbient('launch')
        }, 50)
        return { cameraMode: newMode }
      }),
      toggleLights: () => set(state => ({ cabinLights: !state.cabinLights })),
      toggleHeatShield: () => set(state => ({ heatShield: !state.heatShield })),
      toggleDaySide: () => set(state => ({ isDaySide: !state.isDaySide })),
      toggleLaunchDay: () => set(state => ({ launchDay: !state.launchDay })),

      startExploration: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({ currentScene: 'LUNAR_EXPLORATION', isExploring: true, phase: 'Lunar Surface Exploration' });
        AudioManager.startAmbient('lunar');
      },

      stopExploration: () => {
        AudioManager.stopAll();
        const { clearAllPhases } = useMissionStore.getState();
        clearAllPhases();
        set({ currentScene: 'LUNAR_SURFACE', landed: true, phase: 'The Eagle has landed!' });
        AudioManager.startAmbient('lunar');
      },

      silenceAlarm: () => set({ masterAlarm: false }),
    })),
    {
      name: 'apollo11-mission-state',
      partialize: (state) => ({
        // SOLO guardar configuración del usuario, NO estado de misión
        cameraMode: state.cameraMode,
        cabinLights: state.cabinLights,
        tutorialStep: state.tutorialStep,
        isTutorialActive: state.isTutorialActive,
        isDaySide: state.isDaySide,
        launchDay: state.launchDay
      })
    }
  )
)
