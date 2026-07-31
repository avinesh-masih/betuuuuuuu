/* ============================================================
   GIRLFRIEND'S DAY — script.js
   Handles: welcome reveal, music player, custom video player,
   diary open/close, gallery lightbox, scroll reveals, ambient
   particle canvas, confetti bursts, hero parallax sun.
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------
     0. AMBIENT PARTICLE CANVAS (petals / glitter / hearts)
  --------------------------------------------------------- */
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_GLYPHS = ['🌸', '✨', '💜', '🌻'];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function spawnParticle() {
    return {
      x: Math.random() * canvas.width,
      y: canvas.height + 20,
      glyph: PARTICLE_GLYPHS[Math.floor(Math.random() * PARTICLE_GLYPHS.length)],
      size: 10 + Math.random() * 14,
      speed: 0.3 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.6,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 1.2,
      opacity: 0.25 + Math.random() * 0.4
    };
  }

  const MAX_PARTICLES = window.innerWidth < 700 ? 16 : 26;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = spawnParticle();
    p.y = Math.random() * canvas.height;
    particles.push(p);
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift;
      p.rot += p.rotSpeed;
      if (p.y < -30) Object.assign(p, spawnParticle());

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    });
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  /* ---------------------------------------------------------
     1. CONFETTI BURST (hearts, petals, gold sparkles)
  --------------------------------------------------------- */
  function launchConfetti(originX, originY, count = 34) {
    const glyphs = ['❤️', '🌸', '✨', '💛', '🤍'];
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 220;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      dot.style.cssText = `
        position:fixed; left:${originX}px; top:${originY}px;
        font-size:${14 + Math.random() * 14}px;
        pointer-events:none; z-index:3000;
        transform:translate(-50%,-50%);
        animation: confettiFly 1.3s ease-out forwards;
        animation-delay:${Math.random() * 0.15}s;
        --tx:${tx}px; --ty:${ty}px;
      `;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 1600);
    }
  }
  // inject keyframes for confetti once
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confettiFly {
      0% { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0deg); }
      100% { opacity:0; transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.4) rotate(360deg); }
    }`;
  document.head.appendChild(style);

  /* ---------------------------------------------------------
     2. WELCOME SCREEN → REVEAL
  --------------------------------------------------------- */
  const welcomeScreen = document.getElementById('welcome-screen');
  const revealBtn = document.getElementById('reveal-btn');
  const mainSite = document.getElementById('main-site');

  revealBtn.addEventListener('click', (e) => {
    rippleEffect(revealBtn, e);
    const rect = revealBtn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 26);

    // Start music immediately, inside the click handler, so the browser
    // still recognizes this as a direct user gesture (required by Safari).
    attemptMusicAutoplay();

    setTimeout(() => {
      welcomeScreen.classList.add('hidden');
      mainSite.classList.add('revealed');
      // kick off scroll-reveal check for elements already in view
      revealOnScroll();
    }, 500);
  });

  function rippleEffect(btn, e) {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ry', `${e.clientY - rect.top}px`);
    btn.classList.remove('rippling');
    void btn.offsetWidth;
    btn.classList.add('rippling');
  }

  /* ---------------------------------------------------------
     2.5 PHOTO SLIDESHOW ENGINE
     Auto-detects every photo in assets/photos/ (named photo1,
     photo2, photo3 ... with no gaps, any of .jpg/.jpeg/.png/.webp),
     then applies slideshow only to gallery cards in
     "A Little Bouquet of Us".
  --------------------------------------------------------- */
  const PHOTO_FOLDER = 'assets/photos/';
  const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
  const MAX_PHOTOS_TO_PROBE = 60;
  const MAX_PHOTOS_PER_SLOT = 7;
  const SLIDE_INTERVAL_MS = 5200;
  const CROSSFADE_MS = 1700;
  const SLOT_INTERVAL_JITTER_MS = 700;

  function imageExists(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function detectPhotoAtIndex(n) {
    const candidates = PHOTO_EXTENSIONS.map((ext) => `${PHOTO_FOLDER}photo${n}.${ext}`);
    const results = await Promise.all(candidates.map(imageExists));
    return results.find(Boolean) || null;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function buildPhotoPool() {
    const found = await Promise.all(
      Array.from({ length: MAX_PHOTOS_TO_PROBE }, (_, i) => detectPhotoAtIndex(i + 1))
    );
    const pool = [];
    let consecutiveMisses = 0;
    for (const path of found) {
      if (path) {
        pool.push(path);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
        if (consecutiveMisses >= 3) break; // assume end of sequence
      }
    }
    return pool;
  }

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function startSlotSlideshow(slotEl, photos, startDelay, slotIntervalMs) {
    const img = slotEl.querySelector('.slot-img');
    if (!img || photos.length === 0) return;

    slotEl.classList.remove('img-missing');
    let i = 0;
    let isTransitioning = false;
    img.src = photos[0];

    if (photos.length === 1) return; // nothing to cycle to

    const runCycle = async () => {
      if (isTransitioning) return;
      isTransitioning = true;

      const nextIndex = (i + 1) % photos.length;
      const nextSrc = photos[nextIndex];
      const loadedSrc = await preloadImage(nextSrc);
      if (!loadedSrc) {
        isTransitioning = false;
        return;
      }

      img.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 0.55, offset: 0.5 },
          { opacity: 1, offset: 1 }
        ],
        { duration: CROSSFADE_MS, easing: 'ease-in-out', fill: 'none' }
      );

      setTimeout(() => {
        img.src = loadedSrc;
        i = nextIndex;
        isTransitioning = false;
      }, Math.floor(CROSSFADE_MS * 0.5));
    };

    setTimeout(() => {
      runCycle();
      setInterval(runCycle, slotIntervalMs);
    }, startDelay);
  }

  async function initPhotoSlideshows() {
    const slots = Array.from(document.querySelectorAll('#gallery .photo-slot'));
    if (slots.length === 0) return;

    const pool = await buildPhotoPool();
    if (pool.length === 0) return; // fall back to whatever the static <img src> already points at

    const shuffled = shuffle(pool);
    const groups = slots.map(() => []);

    shuffled.forEach((photoPath, idx) => {
      groups[idx % slots.length].push(photoPath);
    });

    groups.forEach((group, idx) => {
      if (group.length > MAX_PHOTOS_PER_SLOT) {
        groups[idx] = group.slice(0, MAX_PHOTOS_PER_SLOT);
      }
    });

    // Ensure every slot gets at least 2 photos (with reuse fallback) so
    // all placeholders actually animate, including the last ones.
    groups.forEach((group, idx) => {
      if (group.length === 0 && shuffled.length > 0) {
        const first = shuffled[idx % shuffled.length];
        const second = shuffled[(idx + 1) % shuffled.length] || first;
        groups[idx] = first === second ? [first] : [first, second];
        return;
      }

      if (group.length === 1 && shuffled.length > 1) {
        const fallback = shuffled.find((photoPath) => photoPath !== group[0]);
        if (fallback) group.push(fallback);
      }
    });

    slots.forEach((slot, index) => {
      // Use gentle random offsets so transitions feel organic, not like
      // a left-to-right wave.
      const randomStartDelay = Math.floor(Math.random() * SLIDE_INTERVAL_MS);
      const randomJitter = Math.floor((Math.random() * 2 - 1) * SLOT_INTERVAL_JITTER_MS);
      const slotInterval = Math.max(4200, SLIDE_INTERVAL_MS + randomJitter);
      startSlotSlideshow(slot, groups[index], randomStartDelay, slotInterval);
    });
  }

  initPhotoSlideshows();

  /* ---------------------------------------------------------
     3. MUSIC PLAYER
  --------------------------------------------------------- */
  const music = document.getElementById('bg-music');
  const playPauseBtn = document.getElementById('play-pause');
  const playIcon = document.getElementById('play-icon');
  const mpWave = document.getElementById('mp-wave');

  music.volume = 0.6;

  // True only when WE paused the music because a video started playing —
  // used so we know whether to resume it automatically afterwards.
  let musicPausedByVideo = false;

  function setPlayingUI(isPlaying) {
    playIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    mpWave.classList.toggle('playing', isPlaying);
  }

  function attemptMusicAutoplay() {
    // Called from the "Tap to Reveal" click — a real user gesture,
    // so the browser will allow playback to start immediately.
    const playPromise = music.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
    }
  }

  playPauseBtn.addEventListener('click', () => {
    if (music.paused) {
      music.play().then(() => setPlayingUI(true)).catch(() => {});
    } else {
      music.pause();
      setPlayingUI(false);
      // A deliberate manual pause overrides any pending auto-resume.
      musicPausedByVideo = false;
    }
  });

  /* ---------------------------------------------------------
     4. HERO PARALLAX SUN (mouse + scroll)
  --------------------------------------------------------- */
  const heroSun = document.getElementById('hero-sun');
  const hero = document.getElementById('hero');
  if (heroSun && hero) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      heroSun.style.transform = `translate(${relX * 40}px, ${relY * 40}px)`;
    });
  }

  /* ---------------------------------------------------------
     5. CUSTOM EMBEDDED VIDEO PLAYER
  --------------------------------------------------------- */
  const VIDEO_FOLDER = 'assets/video/';
  const VIDEO_EXTENSIONS = ['mp4', 'webm', 'm4v', 'mov'];
  const VIDEO_BASENAME_SEEDS = ['betu', 'video'];
  const MAX_VIDEOS_TO_PROBE = 40;

  const memoryVideo = document.getElementById('memory-video');
  const videoFrame = document.querySelector('.video-frame');
  const videoCenterBtn = document.getElementById('video-center-btn');
  const videoPlayBtn = document.getElementById('video-play-btn');
  const videoPlayIcon = document.getElementById('video-play-icon');
  const videoProgress = document.getElementById('video-progress');
  const videoProgressFill = document.getElementById('video-progress-fill');
  const videoTime = document.getElementById('video-time');
  const videoMuteBtn = document.getElementById('video-mute-btn');
  const videoMuteIcon = document.getElementById('video-mute-icon');
  const videoFullscreenBtn = document.getElementById('video-fullscreen-btn');
  const videoPlaylist = document.getElementById('video-playlist');

  let playlistSources = [];
  let activeVideoIndex = 0;
  let suppressMusicResumeOnce = false;

  function fmt(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function videoExists(src) {
    return new Promise((resolve) => {
      const probe = document.createElement('video');
      let done = false;

      function finish(result) {
        if (done) return;
        done = true;
        probe.removeAttribute('src');
        probe.load();
        resolve(result);
      }

      const timer = setTimeout(() => finish(null), 2800);
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        clearTimeout(timer);
        finish(src);
      };
      probe.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      probe.src = src;
      probe.load();
    });
  }

  async function detectVideoByBaseName(baseName) {
    const candidates = VIDEO_EXTENSIONS.map((ext) => `${VIDEO_FOLDER}${baseName}.${ext}`);
    const results = await Promise.all(candidates.map(videoExists));
    return results.find(Boolean) || null;
  }

  async function buildVideoPool() {
    const ordered = [];
    const seen = new Set();

    const named = await Promise.all(VIDEO_BASENAME_SEEDS.map(detectVideoByBaseName));
    named.filter(Boolean).forEach((src) => {
      if (!seen.has(src)) {
        seen.add(src);
        ordered.push(src);
      }
    });

    const indexed = await Promise.all(
      Array.from({ length: MAX_VIDEOS_TO_PROBE }, (_, i) => detectVideoByBaseName(`video${i + 1}`))
    );

    indexed.forEach((src) => {
      if (src && !seen.has(src)) {
        seen.add(src);
        ordered.push(src);
      }
    });

    return ordered;
  }

  function deriveVideoTitle(src, idx) {
    const fileName = src.split('/').pop() || `video-${idx + 1}`;
    const base = fileName.replace(/\.[^.]+$/, '');
    const match = base.match(/^video(\d+)$/i);
    if (match) return `Memory ${match[1]}`;
    return base
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  function renderPlaylistActiveState() {
    const items = videoPlaylist.querySelectorAll('.video-playlist-item');
    items.forEach((item, idx) => {
      item.classList.toggle('active', idx === activeVideoIndex);
    });
  }

  function loadSelectedVideo(index, shouldAutoplay) {
    if (!playlistSources[index]) return;

    if (!memoryVideo.paused) {
      suppressMusicResumeOnce = true;
    }

    activeVideoIndex = index;
    memoryVideo.src = playlistSources[index];
    memoryVideo.load();
    videoProgressFill.style.width = '0%';
    videoTime.textContent = '0:00 / 0:00';
    renderPlaylistActiveState();

    if (shouldAutoplay) {
      const onCanPlay = () => {
        memoryVideo.removeEventListener('canplay', onCanPlay);
        memoryVideo.play().catch(() => {});
      };
      memoryVideo.addEventListener('canplay', onCanPlay);
    }
  }

  function renderPlaylist(videos) {
    videoPlaylist.innerHTML = '';

    if (videos.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'video-playlist-empty';
      empty.textContent = 'Add videos like assets/video/video1.mp4, video2.mp4, video3.mp4...';
      videoPlaylist.appendChild(empty);
      return;
    }

    videos.forEach((src, idx) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'video-playlist-item';
      item.setAttribute('aria-label', `Play ${deriveVideoTitle(src, idx)}`);
      item.innerHTML = `
        <div class="video-playlist-thumb-wrap">
          <video class="video-playlist-thumb" muted playsinline preload="metadata" src="${src}"></video>
        </div>
        <span class="video-playlist-title">${deriveVideoTitle(src, idx)}</span>
      `;
      item.addEventListener('click', () => loadSelectedVideo(idx, true));

      const thumb = item.querySelector('.video-playlist-thumb');
      thumb.addEventListener('loadeddata', () => {
        if (isFinite(thumb.duration) && thumb.duration > 0.4) {
          thumb.currentTime = 0.2;
        }
      });
      thumb.addEventListener('error', () => {
        item.classList.add('thumb-missing');
      });

      videoPlaylist.appendChild(item);
    });

    renderPlaylistActiveState();
  }

  async function initVideoPlaylist() {
    playlistSources = await buildVideoPool();
    renderPlaylist(playlistSources);
    if (playlistSources.length > 0) {
      loadSelectedVideo(0, false);
    }
  }

  function toggleVideoPlay() {
    if (!memoryVideo.src) return;
    if (memoryVideo.paused) {
      memoryVideo.play().catch(() => {});
    } else {
      memoryVideo.pause();
    }
  }
  function syncBackgroundMusicWithVideo() {
    const shouldPauseMusic = !memoryVideo.paused && !memoryVideo.muted && memoryVideo.volume > 0;

    if (shouldPauseMusic) {
      if (!music.paused) music.pause();
      setPlayingUI(false);
      musicPausedByVideo = true;
      return;
    }

    musicPausedByVideo = false;
    if (music.paused) {
      music.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
    } else {
      setPlayingUI(true);
    }
  }

  function updateVideoMuteIcon() {
    videoMuteIcon.className = memoryVideo.muted || memoryVideo.volume === 0
      ? 'fa-solid fa-volume-xmark'
      : 'fa-solid fa-volume-high';
  }

  memoryVideo.addEventListener('play', () => {
    videoPlayIcon.className = 'fa-solid fa-pause';
    videoFrame.classList.add('is-playing');
    syncBackgroundMusicWithVideo();
  });
  memoryVideo.addEventListener('pause', () => {
    videoPlayIcon.className = 'fa-solid fa-play';
    videoFrame.classList.remove('is-playing');

    if (suppressMusicResumeOnce) {
      suppressMusicResumeOnce = false;
      return;
    }

    syncBackgroundMusicWithVideo();
  });
  memoryVideo.addEventListener('ended', () => {
    syncBackgroundMusicWithVideo();
  });
  memoryVideo.addEventListener('timeupdate', () => {
    const pct = (memoryVideo.currentTime / (memoryVideo.duration || 1)) * 100;
    videoProgressFill.style.width = `${pct}%`;
    videoTime.textContent = `${fmt(memoryVideo.currentTime)} / ${fmt(memoryVideo.duration)}`;
  });
  memoryVideo.addEventListener('loadedmetadata', () => {
    videoTime.textContent = `${fmt(0)} / ${fmt(memoryVideo.duration)}`;
    videoFrame.style.aspectRatio = '16 / 9';
  });
  videoCenterBtn.addEventListener('click', toggleVideoPlay);
  videoPlayBtn.addEventListener('click', toggleVideoPlay);
  videoProgress.addEventListener('click', (e) => {
    const rect = videoProgress.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (isFinite(memoryVideo.duration)) memoryVideo.currentTime = ratio * memoryVideo.duration;
  });
  videoMuteBtn.addEventListener('click', () => {
    memoryVideo.muted = !memoryVideo.muted;
    updateVideoMuteIcon();
    syncBackgroundMusicWithVideo();
  });
  memoryVideo.addEventListener('volumechange', () => {
    updateVideoMuteIcon();
    syncBackgroundMusicWithVideo();
  });
  videoFullscreenBtn.addEventListener('click', () => {
    if (videoFrame.requestFullscreen) videoFrame.requestFullscreen();
    else if (memoryVideo.webkitEnterFullscreen) memoryVideo.webkitEnterFullscreen();
  });
  initVideoPlaylist();

  /* ---------------------------------------------------------
     6. GALLERY LIGHTBOX
  --------------------------------------------------------- */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('.slot-img');
      lightboxImg.src = img ? img.src : '';
      lightbox.classList.add('open');
    });
  });
  function closeLightbox() { lightbox.classList.remove('open'); }
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

  /* ---------------------------------------------------------
     7. DIARY OPEN/CLOSE ANIMATION
  --------------------------------------------------------- */
  const diaryCover = document.getElementById('diary-cover');
  const diaryHint = document.getElementById('diary-hint');
  const diaryCloseBtn = document.getElementById('diary-close-btn');

  function openDiary() {
    diaryCover.classList.add('open');
    diaryHint.textContent = 'tap to close';
  }
  function closeDiary() {
    diaryCover.classList.remove('open');
    diaryHint.textContent = 'tap to open';
  }
  diaryCover.addEventListener('click', () => {
    diaryCover.classList.contains('open') ? closeDiary() : openDiary();
  });
  diaryCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDiary();
  });

  /* ---------------------------------------------------------
     8. FOREVER BUTTON (final section)
  --------------------------------------------------------- */
  const foreverBtn = document.getElementById('forever-btn');
  foreverBtn.addEventListener('click', (e) => {
    rippleEffect(foreverBtn, e);
    foreverBtn.classList.remove('glow-pulse');
    void foreverBtn.offsetWidth;
    foreverBtn.classList.add('glow-pulse');
    const rect = foreverBtn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
  });

  /* ---------------------------------------------------------
     9. SCROLL REVEAL (IntersectionObserver)
  --------------------------------------------------------- */
  const revealTargets = document.querySelectorAll('.fade-in, .reveal-up');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => observer.observe(el));

  function revealOnScroll() {
    revealTargets.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        el.classList.add('in-view');
      }
    });
  }
  // trigger hero elements immediately once revealed
  revealOnScroll();
});