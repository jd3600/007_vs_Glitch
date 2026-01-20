// Logique de base pour le jeu de duel 007 (Fetch, Encrypt, Push)
// Thème: Fortnite / Cyberpunk

const ACTIONS = {
  FETCH: 'FETCH', // Se charger (prendre une balle)
  ENCRYPT: 'ENCRYPT', // Se protéger (bouclier)
  PUSH: 'PUSH', // Tirer (utiliser une balle)
};

const INITIAL_STATE = {
  ammo: 0,
  isShielded: false,
  momentum: 1.0, // Multiplicateur de probabilité
  health: 3,
  encryptCount: 0,
  nextPushBonus: 0,
};

let player = { ...INITIAL_STATE };
let opponent = { ...INITIAL_STATE };
let gameLog = [];
let debugLogs = [];
let isChronoMode = true; // Mode Chrono actif par défaut
let countdown = 3;
let isGameInAction = false; // Flag pour savoir si le combat a commencé
let timerInterval = null;
let countdownStep = 100; // Mise à jour toutes les 100ms pour fluidité
let timeLeft = 3000; // ms
let selectedAction = null; // Action mémorisée pour le tour simultané

// --- PLAYER SPRITE MANAGEMENT ---
const SPRITE_PATHS = {
  player: '/assets/players/007_',
  opponent: '/assets/players/glitch_',
};

const SPRITE_STATES = {
  IDLE: 'initiale.png',
  FETCH: 'fetch.png',
  ENCRYPT: 'encrypt.png',
  PUSH1: 'push1.png',
  PUSH2: 'push2.png',
};

/**
 * Met à jour le sprite d'un personnage
 * @param {string} entity - 'player' ou 'opponent'
 * @param {string} state - L'état du sprite (SPRITE_STATES)
 */
function updateSprite(type, state) {
  const element = document.querySelector(
    type === 'player' ? '.avatar-image.cloud9' : '.avatar-image.glitch',
  );
  const path = SPRITE_PATHS[type];

  if (state === 'PUSH') {
    // Séquence PUSH : Étape 1 (Boule)
    element.style.backgroundImage = `url(${path}push1.png)`;

    setTimeout(() => {
      // Étape 2 (Faisceau/Impact)
      element.style.backgroundImage = `url(${path}push2.png)`;

      setTimeout(() => {
        // Retour à la normale
        element.style.backgroundImage = `url(${path}initiale.png)`;
      }, 800);
    }, 150); // 150ms pour l'anticipation
  } else {
    // Autres états (FETCH, ENCRYPT, IDLE)
    // On convertit en minuscule pour correspondre au nom de fichier, sauf pour INITIALE qui devient initiale
    const fileName =
      state === 'INITIALE' ? 'initiale.png' : state.toLowerCase() + '.png';
    element.style.backgroundImage = `url(${path}${fileName})`;
  }
}

// GHOST MODE STATE
let clickCount = 0;
let lastClickTime = 0;

/**
 * Gère les vidéos du timer
 * Peut prendre une seule action (pour le début ou une action simple)
 * Ou un objet pour les duels : { center, left, right }
 */
function playVideo(config) {
  const vsVideo = document.getElementById('vs-video');
  const pVideo = document.getElementById('player-video');
  const oVideo = document.getElementById('opponent-video');
  const duelLabels = document.getElementById('duel-labels');

  // Reset
  [vsVideo, pVideo, oVideo].forEach((v) => {
    if (v) {
      v.classList.remove('visible');
      v.src = ''; // Clear src to avoid flicker of previous video
      v.pause();
    }
  });

  if (typeof config === 'string') {
    // Mode simple (ex: ACTION)
    if (vsVideo) {
      vsVideo.src = `./videos/${config}.mov`;
      vsVideo.classList.add('visible');
      vsVideo.load();
      vsVideo.play().catch((e) => console.log('Vidéo non trouvée:', config));
    }
  } else {
    // Mode Duel ou Actions spécifiques
    const promises = [];

    // VS.mov au centre
    if (vsVideo && config.center) {
      vsVideo.src = `./videos/${config.center}.mov`;
      vsVideo.classList.add('visible');
      vsVideo.load();
      promises.push(vsVideo.play());
    }
    // Action Player à gauche
    if (pVideo && config.left) {
      pVideo.src = `./videos/${config.left}.mov`;
      pVideo.classList.add('visible');
      pVideo.load();
      promises.push(pVideo.play());
    }
    // Action Opponent à droite
    if (oVideo && config.right) {
      oVideo.src = `./videos/${config.right}.mov`;
      oVideo.classList.add('visible');
      oVideo.load();
      promises.push(oVideo.play());
    }

    // Synchronisation
    Promise.all(promises.map((p) => p.catch((e) => {})));
  }
}

function stopVideo() {
  const vsVideo = document.getElementById('vs-video');
  const pVideo = document.getElementById('player-video');
  const oVideo = document.getElementById('opponent-video');
  const duelLabels = document.getElementById('duel-labels');

  [vsVideo, pVideo, oVideo].forEach((v) => {
    if (v) {
      v.classList.remove('visible');
      v.pause();
    }
  });

  if (duelLabels) {
    duelLabels.classList.remove('visible');
  }
}

/**
 * Gère le décompte et la pénalité
 */
function startCountdown() {
  if (timerInterval) clearInterval(timerInterval);
  selectedAction = null; // Reset de l'action sélectionnée au début du tour
  isGameInAction = false; // Le combat n'a pas encore commencé durant le décompte

  updateSprite('player', 'INITIALE'); // Force le repos
  updateSprite('opponent', 'INITIALE'); // Force le repos

  // Phase 1 : Lancement de la vidéo ACTION
  playVideo('ACTION');

  if (!isChronoMode) {
    timeLeft = 3000;
    updateTimerUI();
    return;
  }

  timeLeft = 3000;
  updateTimerUI();

  timerInterval = setInterval(() => {
    timeLeft -= countdownStep;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timeLeft = 0;
      updateTimerUI();
      resolveDuel(); // Résolution globale à zéro
    }
    updateTimerUI();
  }, countdownStep);
}

function resolveDuel() {
  const opponentAction = getOpponentAction();
  const playerAction = selectedAction;

  isGameInAction = true; // Le combat commence maintenant

  addDebugLog(
    `ACTION! - Player: ${playerAction || 'NONE'} | AI: ${opponentAction}`,
  );

  // Phase 2 : VS.mov ET les actions des joueurs simultanément
  // L'utilisateur veut que VS.mov apparaisse en même temps que les actions des joueurs après ACTION.mov
  playVideo({
    center: 'VS',
    left: playerAction,
    right: opponentAction,
  });

  // Animation de révélation au centre
  const statusText = document.querySelector('.status-text');
  if (statusText) {
    statusText.textContent = `${playerAction || 'DÉCOUVERT'} vs ${opponentAction}`;
    statusText.style.fontSize = '12px'; // Réduire un peu la taille pour que ça rentre
    if (!playerAction) statusText.classList.add('exposed-text');
  }

  setTimeout(() => {
    let result;
    if (!playerAction) {
      addDebugLog('[TIMER] Temps écoulé - Statut: À Découvert.');
      result = resolveExposedActions(opponentAction);
    } else {
      result = resolveActions(playerAction, opponentAction);
    }

    updateGameState(result);
    renderGame();

    // Reset visuel et relance le chrono
    setTimeout(() => {
      stopVideo();
      const statusText = document.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'ACTION!';
        statusText.style.fontSize = ''; // Reset font size
        statusText.classList.remove('exposed-text');
      }
      if (isChronoMode) startCountdown();
    }, 2000); // Temps augmenté pour mieux voir les vidéos
  }, 1000);
}

function handleExposed() {
  // Cette fonction est remplacée par resolveDuel
}

function playExposedTurn() {
  const opponentAction = getOpponentAction();
  addDebugLog(
    `EXPOSED TURN: Player=NONE | AI=${opponentAction} (+20% Precision)`,
  );

  // Résolution spéciale : Joueur ne fait rien, Adversaire a un bonus
  const result = resolveExposedActions(opponentAction);

  updateGameState(result);
  renderGame();

  // Reset visuel après un délai et redémarre le chrono
  setTimeout(() => {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = 'ACTION!';
      statusText.classList.remove('exposed-text');
    }
    if (isChronoMode) startCountdown();
  }, 2000);
}

function resolveExposedActions(p2Action) {
  player.isShielded = false;
  opponent.isShielded = false;

  let log = `JOUEUR À DÉCOUVERT ! vs Adversaire: ${p2Action}`;

  // Actions de préparation de l'IA
  if (p2Action === ACTIONS.FETCH) {
    playVideo({ right: ACTIONS.FETCH });
    updateSprite('opponent', 'FETCH');
    setTimeout(() => updateSprite('opponent', 'INITIALE'), 1000);
    const { success, detail } = calculateProbability('opponent', 0.9 + 0.2); // +20%
    addDebugLog(`OPPONENT FETCH (EXPOSED): ${detail}`);
    if (success) {
      opponent.ammo++;
      opponent.momentum = Math.min(2.0, opponent.momentum + 0.1);
    }
  }

  if (p2Action === ACTIONS.ENCRYPT) {
    playVideo({ right: ACTIONS.ENCRYPT });
    opponent.isShielded = true;
    updateSprite('opponent', 'ENCRYPT');
    setTimeout(() => updateSprite('opponent', 'INITIALE'), 800);
  }

  // Action d'attaque de l'IA
  if (p2Action === ACTIONS.PUSH) {
    playVideo({ right: ACTIONS.PUSH });
    updateSprite('opponent', 'PUSH');
    opponent.ammo--;
    // Le joueur est à découvert, donc pas de bouclier possible
    player.health--;
    opponent.momentum = Math.min(2.0, opponent.momentum + 0.3);
    log += ' | DOMMAGE DIRECT! Vous étiez à découvert.';

    const playerImg = document.querySelector('.avatar-image.cloud9');
    if (playerImg) {
      playerImg.classList.remove('flash-red');
      void playerImg.offsetWidth;
      playerImg.classList.add('flash-red');
    }

    // EFFET GLITCH ERROR sur le terminal
    triggerTerminalGlitch();
  }

  gameLog.push(log);
  return log;
}

function updateTimerUI() {
  const timerText = document.querySelector('.timer-text');
  const timerBar = document.querySelector('.timer-bar');

  if (timerText) {
    timerText.textContent = isChronoMode
      ? `${Math.ceil(timeLeft / 1000)}`
      : '∞';
  }

  if (timerBar) {
    const totalDash = 339.29; // 2 * PI * 54
    const progress = timeLeft / 3000;
    const offset = totalDash * (1 - progress);
    timerBar.style.strokeDasharray = totalDash;
    timerBar.style.strokeDashoffset = offset;

    // Change couleur si temps faible
    if (progress < 0.3) {
      timerBar.style.stroke = 'var(--neon-pink)';
    } else {
      timerBar.style.stroke = 'var(--neon-blue)';
    }

    // Si on est en mode libre, on remplit le cercle
    if (!isChronoMode) {
      timerBar.style.strokeDashoffset = 0;
      timerBar.style.stroke = 'var(--neon-blue)';
    }
  }
}

/**
 * Met à jour l'affichage visuel des munitions
 * @param {number} currentAmmo
 * @param {boolean} isGain - Si vrai, déclenche l'animation de gain
 */
function updateAmmoUI(entity, currentAmmo, isGain = false) {
  const containerId =
    entity === 'player' ? 'player-ammo-container' : 'opponent-ammo-container';
  const display = document.getElementById(containerId);

  if (!display) return;

  // Initialisation si vide (5 cellules par rangée comme demandé)
  if (display.children.length === 0) {
    display.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const cell = document.createElement('div');
      cell.classList.add('ammo-cell-mini');
      display.appendChild(cell);
    }
  }

  const cells = display.querySelectorAll('.ammo-cell-mini');
  cells.forEach((cell, index) => {
    const wasActive = cell.classList.contains('active');
    const isActive = index < currentAmmo;

    if (isActive) {
      cell.classList.add('active');
      if (!wasActive && isGain && index === currentAmmo - 1) {
        cell.classList.add('gain-anim');
        setTimeout(() => cell.classList.remove('gain-anim'), 400);
      }
    } else {
      cell.classList.remove('active');
    }
  });
}

/**
 * Déclenche l'alerte de munitions vides
 */
function triggerAmmoEmptyAlert() {
  const display = document.getElementById('player-ammo-container');
  if (display) {
    display.classList.remove('ammo-empty-alert');
    void display.offsetWidth;
    display.classList.add('ammo-empty-alert');
    setTimeout(() => display.classList.remove('ammo-empty-alert'), 400);
  }
}

/**
 * Déclenche l'effet visuel Glitch Error sur le terminal
 */
function triggerTerminalGlitch() {
  const debugConsole = document.getElementById('debug-console');
  if (debugConsole) {
    debugConsole.classList.add('terminal-error');
    setTimeout(() => {
      debugConsole.classList.remove('terminal-error');
    }, 500);
  }
}

function addDebugLog(msg, customClass = '') {
  const logEntry = {
    time: new Date().toLocaleTimeString(),
    msg: msg,
    className: customClass,
  };
  debugLogs.push(logEntry);
  if (debugLogs.length > 15) debugLogs.shift(); // Augmenté pour le logo

  renderGame();
}

/**
 * Secret Ghost Mode Logic
 */
function handleDebugHeaderClick() {
  const now = Date.now();
  if (now - lastClickTime < 1000) {
    clickCount++;
  } else {
    clickCount = 1;
  }
  lastClickTime = now;

  if (clickCount === 3) {
    clickCount = 0;
    activateGhostMode();
  }
}

function activateGhostMode() {
  // 1. Jouer le son
  const audio = new Audio(
    'https://actions.google.com/sounds/v1/science_fiction/digital_code_quick.ogg',
  );
  audio.play().catch((e) => console.log('Audio play failed', e));

  // 2. Vibration du terminal
  const debugConsole = document.getElementById('debug-console');
  if (debugConsole) {
    debugConsole.classList.add('terminal-unlock');
    setTimeout(() => debugConsole.classList.remove('terminal-unlock'), 2000);
  }

  // 3. Message d'accès
  addDebugLog('ACCESS GRANTED - AGENT 007 - WELCOME BACK', 'ghost-access');

  // 4. Lancement du Logo avec effet de décryptage
  setTimeout(revealGhostLogo, 1000);
}

const GHOST_LOGO = [
  '      ___           ___           ___     ',
  '     /\\\\  \\\\         /\\\\  \\\\         /\\\\  \\\\    ',
  '    /  \\\\  \\\\       /  \\\\  \\\\        \\\\__\\\\  \\\\   ',
  '   / /\\\\ \\\\  \\\\     / /\\\\ \\\\  \\\\       /  /__/   ',
  '  / /  \\\\ \\\\  \\\\   / /  \\\\ \\\\  \\\\     /  /  /    ',
  ' / /__/ \\\\ \\\\__\\\\ / /__/ \\\\ \\\\__\\\\   /__/  /     ',
  ' \\\\ \\\\  \\\\ / /  / \\\\ \\\\  \\\\ / /  /   \\\\__\\\\/__/      ',
  '  \\\\ \\\\__\\\\/__/   \\\\ \\\\__\\\\/__/                    ',
];

function revealGhostLogo() {
  const chars = '@#$%&';
  let currentLines = GHOST_LOGO.map((line) =>
    line
      .split('')
      .map((c) =>
        c === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)],
      )
      .join(''),
  );

  // Ajouter l'espace pour le logo dans les logs
  debugLogs.push({ isLogo: true, lines: currentLines });
  renderGame();

  let lineToReveal = 0;
  const interval = setInterval(() => {
    if (lineToReveal >= GHOST_LOGO.length) {
      clearInterval(interval);
      return;
    }

    // Révéler la ligne en doré
    const logoEntry = debugLogs.find((l) => l.isLogo);
    if (logoEntry) {
      logoEntry.lines[lineToReveal] = GHOST_LOGO[lineToReveal];
      renderGame();
    }
    lineToReveal++;
  }, 150);
}

/**
 * Calcule la probabilité de réussite d'une action basée sur le Momentum
 * @param {string} entity - 'player' ou 'opponent'
 * @param {number} baseProb - Probabilité de base (0 à 1)
 * @returns {object} - { success: boolean, detail: string }
 */
function calculateProbability(entity, baseProb) {
  const currentEntity = entity === 'player' ? player : opponent;
  const momentumEffect = (currentEntity.momentum - 1.0) * 100;
  const detail = `${(baseProb * 100).toFixed(0)}% Base ${momentumEffect >= 0 ? '+' : ''} ${momentumEffect.toFixed(0)}% Momentum`;

  const finalProb = Math.min(baseProb * currentEntity.momentum, 1.0);
  const success = Math.random() < finalProb;

  return { success, detail: `${detail} = ${(finalProb * 100).toFixed(0)}%` };
}

/**
 * Exécute un tour de jeu
 * @param {string} playerAction - L'action choisie par le joueur
 */
function playTurn(playerAction) {
  if (isChronoMode) {
    // En mode Chrono, on mémorise juste l'action et on attend le timer
    selectedAction = playerAction;
    addDebugLog(`ACTION RÉSERVÉE: ${playerAction}`);

    // Mettre en surbrillance le bouton sélectionné
    document
      .querySelectorAll('.action-btn')
      .forEach((btn) => btn.classList.remove('selected-action'));
    const btnId = `btn-${playerAction.toLowerCase()}`;
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('selected-action');

    // On ne change PAS isGameInAction ici car le combat n'a pas commencé
    return;
  }

  if (timerInterval) clearInterval(timerInterval);
  isGameInAction = true; // Mode libre : action immédiate

  const opponentAction = getOpponentAction();
  addDebugLog(`TURN START: Player=${playerAction} | AI=${opponentAction}`);

  // Logique de résolution immédiate en mode libre
  const result = resolveActions(playerAction, opponentAction);

  updateGameState(result);
  renderGame();
}

function getOpponentAction() {
  // --- IA NIVEAU 100 : LOGIQUE TACTIQUE AVANCÉE ---

  // 1. Survie Prioritaire : Si PV bas et joueur a des munitions, l'IA se protège massivement
  if (opponent.health <= 1 && player.ammo > 0) {
    return Math.random() < 0.8 ? ACTIONS.ENCRYPT : ACTIONS.FETCH;
  }

  // 2. Opportunisme : Si le joueur n'a PAS de munitions, l'IA ne se protège JAMAIS
  if (player.ammo <= 0) {
    // Si l'IA a des munitions, elle PUSH pour punir l'impuissance du joueur
    if (opponent.ammo > 0) {
      return ACTIONS.PUSH;
    }
    // Sinon elle FETCH pour se préparer, car elle est en sécurité
    return ACTIONS.FETCH;
  }

  // 3. Agression Calculée : Si l'IA a beaucoup de munitions (>= 2), elle PUSH
  if (opponent.ammo >= 2) {
    return Math.random() < 0.7 ? ACTIONS.PUSH : ACTIONS.ENCRYPT;
  }

  // 4. Cycle standard optimisé
  if (opponent.ammo <= 0) {
    // Si pas de munitions, 70% chance de charger, 30% de se protéger
    return Math.random() < 0.7 ? ACTIONS.FETCH : ACTIONS.ENCRYPT;
  }

  // Défaut : Comportement équilibré mais agressif
  const rand = Math.random();
  if (rand < 0.5) return ACTIONS.PUSH;
  if (rand < 0.8) return ACTIONS.FETCH;
  return ACTIONS.ENCRYPT;
}

function resolveActions(p1Action, p2Action) {
  // Reset boucliers au début du tour
  player.isShielded = false;
  opponent.isShielded = false;

  let log = `Joueur: ${p1Action} vs Adversaire: ${p2Action}`;

  // Gestion de la règle ENCRYPT pour le joueur
  if (p1Action === ACTIONS.ENCRYPT) {
    player.encryptCount++;
    if (player.encryptCount >= 2) {
      player.nextPushBonus = 0.3;
      addDebugLog('PLAYER MOMENTUM BONUS ACTIVATED: +30% Crit on next PUSH');
    }
  }

  // 1. Actions de préparation (Fetch, Encrypt)
  if (p1Action === ACTIONS.FETCH) {
    playVideo({ left: ACTIONS.FETCH });
    updateSprite('player', 'FETCH');
    setTimeout(() => updateSprite('player', 'INITIALE'), 1000);
    const { success, detail } = calculateProbability('player', 0.9);
    addDebugLog(`PLAYER FETCH: ${detail}`);
    if (success) {
      player.ammo++;
      updateAmmoUI('player', player.ammo, true); // Mise à jour avec animation
      player.momentum = Math.min(2.0, player.momentum + 0.1);
      player.encryptCount = 0; // Reset count
    } else {
      log += ' | Le Fetch du joueur a échoué !';
      player.momentum = Math.max(0.5, player.momentum - 0.2);
    }
  }

  if (p1Action === ACTIONS.ENCRYPT) {
    playVideo({ left: ACTIONS.ENCRYPT });
    player.isShielded = true;
    updateSprite('player', 'ENCRYPT');
    setTimeout(() => updateSprite('player', 'INITIALE'), 1000);
  }

  if (p2Action === ACTIONS.FETCH) {
    playVideo({ right: ACTIONS.FETCH });
    updateSprite('opponent', 'FETCH');
    setTimeout(() => updateSprite('opponent', 'INITIALE'), 1000);
    const { success, detail } = calculateProbability('opponent', 0.9);
    addDebugLog(`OPPONENT FETCH: ${detail}`);
    if (success) {
      opponent.ammo++;
      updateAmmoUI('opponent', opponent.ammo, true);
      opponent.momentum = Math.min(2.0, opponent.momentum + 0.1);
    }
  }

  if (p2Action === ACTIONS.ENCRYPT) {
    playVideo({ right: ACTIONS.ENCRYPT });
    opponent.isShielded = true;
    updateSprite('opponent', 'ENCRYPT');
    setTimeout(() => updateSprite('opponent', 'INITIALE'), 1000);
  }

  // 2. Actions d'attaque (Push)
  if (p1Action === ACTIONS.PUSH) {
    playVideo({ left: ACTIONS.PUSH });
    updateSprite('player', 'PUSH');
    player.ammo--;
    updateAmmoUI('player', player.ammo); // Mise à jour après consommation
    const critBase = 0;
    const critBonus = player.nextPushBonus * 100;
    const critDetail = `Base ${critBase}% + Bonus ${critBonus.toFixed(0)}%`;

    addDebugLog(`PLAYER CRIT PROB: ${critDetail} = ${critBonus.toFixed(0)}%`);

    const isCrit = Math.random() < player.nextPushBonus;
    const damage = isCrit ? 2 : 1;

    if (isCrit) addDebugLog('CRITICAL HIT CALCULATED!');

    if (!opponent.isShielded) {
      opponent.health -= damage;
      player.momentum = Math.min(2.0, player.momentum + 0.3);
      log += isCrit
        ? ` | CRITICAL HIT! L'adversaire perd ${damage} PV.`
        : " | HIT! L'adversaire perd 1 PV.";

      // Feedback visuel : shake sur le glitch
      const glitchImg = document.querySelector('.avatar-image.glitch');
      if (glitchImg) {
        glitchImg.classList.remove('shake');
        void glitchImg.offsetWidth; // Trigger reflow
        glitchImg.classList.add('shake');
      }

      // Si The Glitch marque un point (ici le joueur perdrait des HP, mais l'énoncé dit aussi "dès que l'ennemi marque un point")
      // En fait "The Glitch" est l'opposant. S'il blesse le joueur, c'est là qu'on glitch.
    } else {
      log += " | BLOC! L'adversaire était protégé.";
      player.momentum = Math.max(0.5, player.momentum - 0.1);
    }
    // Reset bonus après PUSH
    player.nextPushBonus = 0;
    player.encryptCount = 0;
  }

  if (p2Action === ACTIONS.PUSH) {
    playVideo({ right: ACTIONS.PUSH });
    updateSprite('opponent', 'PUSH');
    opponent.ammo--;
    updateAmmoUI('opponent', opponent.ammo);
    if (!player.isShielded) {
      player.health--;
      opponent.momentum = Math.min(2.0, opponent.momentum + 0.3);
      log += ' | DOMMAGE! Vous perdez 1 PV.';

      // Feedback visuel : flash red sur le joueur
      const playerImg = document.querySelector('.avatar-image.cloud9');
      if (playerImg) {
        playerImg.classList.remove('flash-red');
        void playerImg.offsetWidth; // Trigger reflow
        playerImg.classList.add('flash-red');
      }

      // EFFET GLITCH ERROR sur le terminal
      triggerTerminalGlitch();
    } else {
      log += ' | BLOC! Votre bouclier a tenu.';
      opponent.momentum = Math.max(0.5, opponent.momentum - 0.1);
    }
  }

  gameLog.push(log);
  return log;
}

function updateGameState(result) {
  if (player.health <= 0) {
    alert('GAME OVER - Cyber-défaite');
    resetGame();
  } else if (opponent.health <= 0) {
    alert('VICTOIRE - Top 1');
    resetGame();
  }
}

function resetGame() {
  player = { ...INITIAL_STATE };
  opponent = { ...INITIAL_STATE };
  isGameInAction = false;
  selectedAction = null;
  updateSprite('player', 'INITIALE');
  updateSprite('opponent', 'INITIALE');
  gameLog = ['Nouveau Duel Lancé !'];
  debugLogs = [];
  addDebugLog('GAME RESET - Initializing neural links...');
  addDebugLog('CAUTION: LEVEL 100 IA ACTIVATED - NO MERCY', 'exposed-text');
  clickCount = 0; // Reset secret mode clicks
  updateAmmoUI('player', player.ammo); // Reset UI munitions
  updateAmmoUI('opponent', opponent.ammo);
  if (isChronoMode) startCountdown();
}

function renderGame() {
  const playerZone = document.getElementById('player-zone');
  const opponentZone = document.getElementById('opponent-zone');

  // Initialisation des sprites si non présents
  const checkPlayerSprite = document.querySelector('.avatar-image.cloud9');
  const needsInit =
    !checkPlayerSprite ||
    (checkPlayerSprite && !checkPlayerSprite.style.backgroundImage);

  const controlsZone = document.getElementById('controls-zone');
  const debugConsole = document.getElementById('debug-console');
  const modeToggle = document.getElementById('mode-toggle');

  if (modeToggle) {
    modeToggle.textContent = `MODE: ${isChronoMode ? 'CHRONO' : 'LIBRE'}`;
    modeToggle.onclick = () => {
      isChronoMode = !isChronoMode;
      addDebugLog(`MODE SWITCH: ${isChronoMode ? 'CHRONO' : 'LIBRE'}`);
      renderGame();
      startCountdown();
    };
  }

  if (playerZone) {
    // On ne reconstruit pas le innerHTML si une vidéo est en cours de lecture
    // pour éviter de couper la vidéo à cause du rafraîchissement
    const pVideo = document.getElementById('player-video');
    if (pVideo && pVideo.classList.contains('visible')) {
      // Mise à jour minimale sans toucher au DOM de l'avatar si possible
      // Mais comme on doit mettre à jour les barres de vie, on va juste s'assurer que l'élément video reste.
    }

    playerZone.innerHTML = `
      <div class="avatar-container">
        <video id="player-video" class="side-video" muted playsinline></video>
        <div class="avatar-image cloud9"></div>
        <div class="player">
          <div class="health-bar-container">
            <div class="health-fill" style="width: ${(player.health / 3) * 100}%"></div>
          </div>
          <div id="player-ammo-container" class="ammo-mini-grid"></div>
          <div class="entity-stats">
            AMMO: ${player.ammo} | MOMENTUM: ${player.momentum.toFixed(1)}x
          </div>
        </div>
      </div>
    `;
  }

  if (opponentZone) {
    opponentZone.innerHTML = `
      <div class="avatar-container">
        <video id="opponent-video" class="side-video" muted playsinline></video>
        <div class="avatar-image glitch"></div>
        <div class="opponent">
          <div class="health-bar-container">
            <div class="health-fill" style="width: ${(opponent.health / 3) * 100}%"></div>
          </div>
          <div id="opponent-ammo-container" class="ammo-mini-grid"></div>
          <div class="entity-stats">
            AMMO: ${opponent.ammo} | MOMENTUM: ${opponent.momentum.toFixed(1)}x
          </div>
        </div>
      </div>
    `;
  }

  updateAmmoUI('player', player.ammo);
  updateAmmoUI('opponent', opponent.ammo);

  if (controlsZone) {
    controlsZone.innerHTML = `
      <button class="action-btn fetch ${selectedAction === ACTIONS.FETCH ? 'selected-action' : ''}" id="btn-fetch" title="FETCH">
        <i data-lucide="zap"></i>
      </button>
      <button class="action-btn encrypt ${selectedAction === ACTIONS.ENCRYPT ? 'selected-action' : ''}" id="btn-encrypt" title="ENCRYPT">
        <i data-lucide="shield"></i>
      </button>
      <button class="action-btn push ${selectedAction === ACTIONS.PUSH ? 'selected-action' : ''}" id="btn-push" title="PUSH" ${player.ammo <= 0 ? 'disabled' : ''}>
        <i data-lucide="external-link"></i>
      </button>
    `;

    // Initialiser les icônes Lucide après injection HTML
    if (window.lucide) {
      window.lucide.createIcons();
    }

    document.getElementById('btn-fetch').onclick = () =>
      playTurn(ACTIONS.FETCH);
    document.getElementById('btn-encrypt').onclick = () =>
      playTurn(ACTIONS.ENCRYPT);
    const pushBtn = document.getElementById('btn-push');
    if (pushBtn) {
      // Retirer l'attribut disabled car on gère l'alerte EMPTY nous-mêmes maintenant
      pushBtn.disabled = false;
      pushBtn.onclick = () => {
        if (player.ammo > 0) {
          playTurn(ACTIONS.PUSH);
        } else {
          // Alerte EMPTY
          addDebugLog('ERROR: NO AMMO - FETCH REQUIRED', 'exposed-text');
          triggerAmmoEmptyAlert();
        }
      };
    }
  }

  if (debugConsole) {
    debugConsole.innerHTML = `
      <div class="debug-header" id="debug-header">
        <span>Terminal Debug v1.0.7</span>
        <div class="debug-controls">
          <span>_</span> <span>□</span> <span>×</span>
        </div>
      </div>
      <div class="debug-content">
        ${debugLogs
          .map((log) => {
            if (log.isLogo) {
              return `<div class="ghost-logo">${log.lines.map((line) => `<span class="ghost-logo-line ${line === GHOST_LOGO[log.lines.indexOf(line)] ? 'ghost-access' : ''}">${line}</span>`).join('')}</div>`;
            }
            const timeStr = log.time ? `[${log.time}] ` : '';
            return `<div class="${log.className || ''}">${timeStr}${log.msg}</div>`;
          })
          .join('')}
        <div class="debug-cursor">> _</div>
      </div>
    `;

    // Attacher l'écouteur de clic
    const header = document.getElementById('debug-header');
    if (header) {
      header.onclick = handleDebugHeaderClick;
    }

    // Auto-scroll au bas de la console
    const content = debugConsole.querySelector('.debug-content');
    if (content) content.scrollTop = content.scrollHeight;
  }

  const rightStatsPanel = document.getElementById('right-stats-panel');
  if (rightStatsPanel) {
    rightStatsPanel.innerHTML = `
      <div class="stats-header">
        <span>Combat Analyzer</span>
        <div class="stats-controls">
          <span>RUNNING</span>
        </div>
      </div>
      <div class="stats-content">
        <div class="stat-row"><span>THREAT LEVEL:</span> <span class="stat-value">CRITICAL</span></div>
        <div class="stat-row"><span>SYNC RATE:</span> <span class="stat-value">98.2%</span></div>
        <div class="stat-row"><span>ENCRYPT STATUS:</span> <span class="stat-value">${opponent.isShielded ? 'ACTIVE' : 'READY'}</span></div>
        <div class="stat-row"><span>PROBABILITY:</span> <span class="stat-value">${(opponent.momentum * 100).toFixed(0)}%</span></div>
        <div class="stat-grid">
           <div class="stat-box">A: ${opponent.ammo}</div>
           <div class="stat-box">H: ${opponent.health}</div>
        </div>
      </div>
    `;
  }

  if (needsInit) {
    updateSprite('player', 'INITIALE');
    updateSprite('opponent', 'INITIALE');
  }
}

// Initialisation au chargement
window.onload = () => {
  renderGame();
  updateAmmoUI('player', player.ammo);
  updateAmmoUI('opponent', opponent.ammo);
  if (isChronoMode) startCountdown();
};
