// SEPHYX Sound System
// Cyberpunk audio effects and ambient music using Web Audio API

class SephyxSounds {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isPlaying = false;
        this.currentOscillators = [];
        this.ambientLoop = null;
        this.musicEnabled = localStorage.getItem('sephyx_music') !== 'false';
        
        this.init();
    }

    async init() {
        try {
            // Initialize Web Audio Context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.3; // Master volume
            
            // Create separate gain nodes for music and SFX
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = 0.4;
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = 0.6;
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start ambient music if enabled
            if (this.musicEnabled) {
                // Delay start to avoid autoplay restrictions
                document.addEventListener('click', () => this.startAmbientMusic(), { once: true });
                document.addEventListener('keydown', () => this.startAmbientMusic(), { once: true });
            }
            
        } catch (error) {
            console.log('Web Audio API not supported or failed to initialize');
        }
    }

    // Ambient Music Generation
    startAmbientMusic() {
        if (!this.audioContext || this.isPlaying) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.isPlaying = true;
            this.createAmbientLoop();
        } catch (error) {
            console.log('Failed to start ambient music:', error);
        }
    }

    stopAmbientMusic() {
        if (this.ambientLoop) {
            this.ambientLoop.forEach(node => {
                if (node.stop) node.stop();
            });
            this.ambientLoop = null;
        }
        this.isPlaying = false;
    }

    createAmbientLoop() {
        if (!this.audioContext) return;
        
        this.ambientLoop = [];
        
        // Create cyberpunk ambient pad
        const pad = this.createSynthPad([65.41, 82.41, 98.00], 16); // C2, E2, G2
        this.ambientLoop.push(pad);
        
        // Create bass drone
        const bass = this.createBassDrone(32.70); // C1
        this.ambientLoop.push(bass);
        
        // Create atmospheric noise
        const atmosphere = this.createAtmosphere();
        this.ambientLoop.push(atmosphere);
        
        // Schedule the next loop
        setTimeout(() => {
            if (this.isPlaying) {
                this.stopAmbientMusic();
                this.createAmbientLoop();
            }
        }, 32000); // 32 second loop
    }

    createSynthPad(frequencies, duration) {
        const oscillators = [];
        
        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            
            // Add slight detuning for richness
            osc.detune.setValueAtTime((index - 1) * 5, this.audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800 + Math.sin(this.audioContext.currentTime * 0.1) * 200, this.audioContext.currentTime);
            filter.Q.setValueAtTime(2, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 2);
            gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + duration - 2);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + duration);
            
            oscillators.push(osc);
        });
        
        return oscillators;
    }

    createBassDrone(frequency) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 1);
        gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 30);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 32);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 32);
        
        return osc;
    }

    createAtmosphere() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate pink noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        noise.loop = true;
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 3);
        gain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 29);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 32);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        
        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + 32);
        
        return noise;
    }

    // Sound Effects
    playGlitchSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playClickSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    playHoverSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playSuccessSound() {
        if (!this.audioContext) return;
        
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + 0.3);
            }, index * 100);
        });
    }

    playErrorSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.5);
    }

    playTerminalSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    playTypingSound() {
        if (!this.audioContext) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(1500 + Math.random() * 500, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    playVaultSound() {
        if (!this.audioContext) return;
        
        // Create a special vault access sound
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
                filter.Q.setValueAtTime(5, this.audioContext.currentTime);
                
                gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start(this.audioContext.currentTime);
                osc.stop(this.audioContext.currentTime + 0.5);
            }, index * 150);
        });
    }

    // Music Control
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('sephyx_music', this.musicEnabled);
        
        if (this.musicEnabled) {
            this.startAmbientMusic();
        } else {
            this.stopAmbientMusic();
        }
    }

    setMusicVolume(volume) {
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    setSFXVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                if (e.target.classList.contains('glitch') || e.target.closest('.glitch')) {
                    this.playGlitchSound();
                } else {
                    this.playClickSound();
                }
            }
        });

        // Link clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                this.playClickSound();
            }
        });

        // Hover effects for interactive elements
        const interactiveElements = 'button, a, .nav-link, .product-card, .cart-btn, input[type="submit"]';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(interactiveElements)) {
                this.playHoverSound();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            this.playSuccessSound();
        });

        // Input typing
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key.length === 1 || e.key === 'Backspace') {
                    this.playTypingSound();
                }
            }
        });

        // Terminal messages
        const originalShowTerminalMessage = window.app?.showTerminalMessage;
        if (window.app && originalShowTerminalMessage) {
            window.app.showTerminalMessage = (message) => {
                this.playTerminalSound();
                originalShowTerminalMessage.call(window.app, message);
            };
        }

        // Vault access
        document.addEventListener('vault-access', () => {
            this.playVaultSound();
        });

        // Error states
        window.addEventListener('error', () => {
            this.playErrorSound();
        });

        // Page visibility change (pause/resume music)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.musicGain) {
                    this.musicGain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.5);
                }
            } else {
                if (this.musicGain && this.musicEnabled) {
                    this.musicGain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.5);
                }
            }
        });

        // Music toggle button
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('click', () => {
                this.toggleMusic();
            });
        }
    }

    // Special Effects
    playStartupSequence() {
        // Play a special startup sound sequence
        setTimeout(() => this.playSuccessSound(), 0);
        setTimeout(() => this.playTerminalSound(), 300);
        setTimeout(() => this.playClickSound(), 600);
    }

    playShutdownSequence() {
        // Play a shutdown sound sequence
        this.playGlitchSound();
        setTimeout(() => this.playErrorSound(), 200);
    }

    // Reactive audio effects
    createReactiveFilter() {
        if (!this.audioContext || !this.musicGain) return;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        
        // Connect between music gain and master gain
        this.musicGain.disconnect();
        this.musicGain.connect(filter);
        filter.connect(this.masterGain);
        
        return filter;
    }

    // Cleanup
    destroy() {
        this.stopAmbientMusic();
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Initialize sound system
let sephyxSounds = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sephyxSounds = new SephyxSounds();
    });
} else {
    sephyxSounds = new SephyxSounds();
}

// Export for global access
window.sephyxSounds = sephyxSounds;

// Integration with existing app
document.addEventListener('DOMContentLoaded', () => {
    // Hook into the main app's music toggle
    const originalToggleMusic = window.app?.toggleMusic;
    if (window.app && originalToggleMusic) {
        window.app.toggleMusic = function() {
            originalToggleMusic.call(this);
            if (sephyxSounds) {
                sephyxSounds.toggleMusic();
            }
        };
    }
    
    // Play startup sequence when app loads
    if (sephyxSounds) {
        setTimeout(() => {
            sephyxSounds.playStartupSequence();
        }, 1000);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (sephyxSounds) {
        sephyxSounds.playShutdownSequence();
        sephyxSounds.destroy();
    }
});
