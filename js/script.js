const $ = (selector) => document.querySelector(selector);

// Microphone starts automatically: blow naturally to extinguish the candles,
// even while background music is playing!
const cake = $("#cake");
const blowHint = $("#blowHint");
const wishResult = $("#wishResult");
const micMeterFill = $("#micMeterFill");
const blowFallbackBtn = $("#blowFallbackBtn");

let candlesBlown = false;
let microphoneStream = null;
let microphoneContext = null;

function blowCandles() {
  if (candlesBlown) return;
  candlesBlown = true;
  cake.classList.add("blown");
  if (micMeterFill) micMeterFill.style.width = "100%";
  if (blowFallbackBtn) blowFallbackBtn.style.display = "none";
  blowHint.textContent = "Yay! Lilinnya padam. Make a wish! ✨";
  wishResult.classList.add("show");
  if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
  if (microphoneContext && microphoneContext.state !== "closed") {
    microphoneContext.close().catch(() => {});
  }
  confettiBurst();
}

if (blowFallbackBtn) {
  blowFallbackBtn.addEventListener("click", blowCandles);
}

// Allow clicking the cake itself as an intuitive backup if desired
if (cake) {
  cake.style.cursor = "pointer";
  cake.addEventListener("click", () => {
    if (!candlesBlown) blowCandles();
  });
}

async function listenForBlow() {
  if (!navigator.mediaDevices?.getUserMedia) {
    blowHint.textContent = "Mikrofon tidak tersedia di konteks ini (gunakan HTTPS atau localhost). Klik kue untuk meniup lilin.";
    if (blowFallbackBtn) blowFallbackBtn.style.display = "inline-block";
    return;
  }
  try {
    blowHint.textContent = "Izinkan akses mikrofon, lalu tiup lilinnya...";
    // Keep constraints broad so all browsers/devices accept the stream reliably
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    microphoneContext = new AudioContextClass();
    if (microphoneContext.state === "suspended") {
      await microphoneContext.resume();
    }

    const source = microphoneContext.createMediaStreamSource(microphoneStream);

    // Low-pass filter (~700Hz) captures breath/wind rumble while reducing high-pitched music/treble
    const lowPass = microphoneContext.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 700;

    const analyser = microphoneContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;

    source.connect(lowPass);
    lowPass.connect(analyser);

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    let ambientLow = 0.018;
    let warmupFrames = 0;
    let blowScore = 0;
    blowHint.textContent = "Mikrofon aktif — tiup lilinnya (atau klik kue jika perlu). 💨";

    const detect = () => {
      if (candlesBlown) return;

      if (microphoneContext && microphoneContext.state === "suspended") {
        microphoneContext.resume().catch(() => {});
      }

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Compute RMS volume from low-passed signal
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const s = (timeData[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / timeData.length);

      // Compute low-band spectral energy (bins 1..16)
      let lowBandSum = 0;
      for (let i = 1; i <= 16; i++) {
        lowBandSum += freqData[i];
      }
      const lowBandAvg = (lowBandSum / 16) / 255;

      // Update visual meter so user sees mic response immediately
      const meterPct = Math.min(100, Math.round((rms / 0.14) * 100));
      if (micMeterFill) micMeterFill.style.width = `${meterPct}%`;

      // Calibrate ambient floor gently when not blowing
      if (warmupFrames < 30) {
        ambientLow = (ambientLow * warmupFrames + rms) / (warmupFrames + 1);
        warmupFrames++;
      } else if (rms < ambientLow * 1.65) {
        ambientLow = ambientLow * 0.95 + rms * 0.05;
      }

      // Trigger when breath/wind pushes low-frequency energy clearly above ambient
      const threshold = Math.max(0.048, ambientLow * 1.85);
      const blowingNow = rms > threshold && lowBandAvg > 0.10;

      if (blowingNow) {
        blowScore += 1.5;
      } else {
        blowScore = Math.max(0, blowScore - 0.65);
      }

      if (blowScore >= 5.5) {
        blowCandles();
        return;
      }

      requestAnimationFrame(detect);
    };

    detect();
  } catch (error) {
    blowHint.textContent = "Mikrofon tidak aktif/diizinkan. Tiup dengan klik kue atau tombol di bawah.";
    if (blowFallbackBtn) blowFallbackBtn.style.display = "inline-block";
  }
}

// Resume AudioContext on first user interaction (such as clicking Play music) if browser suspended it
document.addEventListener("pointerdown", () => {
  if (microphoneContext && microphoneContext.state === "suspended" && !candlesBlown) {
    microphoneContext.resume().catch(() => {});
  }
}, { passive: true });

listenForBlow();

function confettiBurst() {
  const colors = ["#6e9fd2", "#f1c96b", "#ffffff", "#a8c9e9", "#e7a9bb"];
  for (let i = 0; i < 42; i++) {
    const bit = document.createElement("span");
    bit.style.cssText = `position:fixed;z-index:70;left:${Math.random()*100}vw;top:-12px;width:${5+Math.random()*6}px;height:${8+Math.random()*8}px;background:${colors[i%colors.length]};border-radius:2px;pointer-events:none;`;
    document.body.appendChild(bit);
    const drift = (Math.random() - .5) * 240;
    const duration = 1800 + Math.random() * 1500;
    bit.animate([
      { transform: "translate3d(0,0,0) rotate(0)", opacity: 1 },
      { transform: `translate3d(${drift}px,${window.innerHeight+50}px,0) rotate(${500+Math.random()*900}deg)`, opacity: .1 }
    ], { duration, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => bit.remove();
  }
}

// Envelope & Letter opening interaction.
const envelopeBox = $("#envelopeBox");
const openLetterBtn = $("#openLetter");
const sealText = $("#sealText");
const letterCaption = $("#letterCaption");

function toggleEnvelope() {
  const isOpen = envelopeBox.classList.toggle("open");
  envelopeBox.setAttribute("aria-expanded", String(isOpen));
  sealText.textContent = isOpen ? "Close" : "Tap to open";
  letterCaption.textContent = isOpen
    ? "A LETTER TO KEEP · KLIK LAGI UNTUK MENUTUP AMPLOP."
    : "KLIK AMPLOP UNTUK MEMBUKA SURATNYA · YOU ARE SO LOVED.";
}

envelopeBox.addEventListener("click", (e) => {
  if (!envelopeBox.classList.contains("open") || e.target.closest("#openLetter") || !e.target.closest(".letter-sheet")) {
    toggleEnvelope();
  }
});

envelopeBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleEnvelope();
  }
});

// Gallery lightbox.
const photoCards = [...document.querySelectorAll(".photo-card:not(.gallery-clone)")];
const lightbox = $("#lightbox");
const lightboxImage = $("#lightboxImage");
const lightboxCaption = $("#lightboxCaption");
let activePhoto = 0;

function showPhoto(index) {
  activePhoto = (index + photoCards.length) % photoCards.length;
  const card = photoCards[activePhoto];
  lightboxImage.src = card.querySelector("img").src;
  lightboxImage.alt = card.querySelector("img").alt;
  lightboxCaption.textContent = card.dataset.caption;
}
function openPhoto(index) {
  showPhoto(index);
  lightbox.classList.add("show");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closePhoto() {
  lightbox.classList.remove("show");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
photoCards.forEach((card, index) => card.addEventListener("click", () => openPhoto(index)));
$("#lightboxClose").addEventListener("click", closePhoto);
$("#lightboxPrev").addEventListener("click", () => showPhoto(activePhoto - 1));
$("#lightboxNext").addEventListener("click", () => showPhoto(activePhoto + 1));
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closePhoto(); });
document.addEventListener("keydown", (event) => {
  if (!lightbox.classList.contains("show")) return;
  if (event.key === "Escape") closePhoto();
  if (event.key === "ArrowRight") showPhoto(activePhoto + 1);
  if (event.key === "ArrowLeft") showPhoto(activePhoto - 1);
});

// Uploaded birthday song.
const birthdayAudio = $("#birthdayAudio");
let musicPlaying = false;

birthdayAudio.volume = 0.75;

async function toggleMusic() {
  const button = $("#musicToggle");
  if (!musicPlaying) {
    try {
      await birthdayAudio.play();
      musicPlaying = true;
      button.classList.add("playing");
      button.setAttribute("aria-label", "Jeda musik");
      $("#musicLabel").textContent = "Pause music";
    } catch (error) {
      showToast("Browser belum bisa memutar lagu. Coba tekan Play music lagi.");
    }
  } else {
    birthdayAudio.pause();
    musicPlaying = false;
    button.classList.remove("playing");
    button.setAttribute("aria-label", "Putar musik");
    $("#musicLabel").textContent = "Play music";
  }
}
$("#musicToggle").addEventListener("click", toggleMusic);

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

// Smooth reveal for sections.
const revealTargets = document.querySelectorAll(".section-heading,.cake-wrap,.letter-side,.letter-card-wrap,.memory-header,.photo-card,.closing-section h2");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
revealTargets.forEach(el => observer.observe(el));
