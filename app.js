/* ==========================================================================
   overไพร๊ - Core Gameplay Logic Engine (app.js)
   ========================================================================== */

// 1. Game State Setup
const gameState = {
    coins: 200,              // Player starting capital
    debt: 0,                 // Satirical debt accumulator
    currentDrinkNum: 1,      // 1 to 3
    currentDrink: {
        color: 'brown',
        sleeve: false,
        sticker: false,
        straw: false
    },
    selectedMarketing: [],   // Active campaigns
    marketingCost: 0,        // Marketing spend for current drink
    price: 0,                // Set selling price
    totalRevenue: 0,         // Target is 1000 C
    npcSequence: ['key', 'martin', 'lee'], // Random 3 of 4 unique NPCs
    currentNPC: null,
    gelatoBought: 'ไม่มี',    // Ending statistics
    gelatoCost: 0,
    drinksHistory: []        // Record of customized drinks
};

// 1.5 Audio Management System (BGM & SFX Controller)
const audioManager = {
    isMuted: false,
    currentBgm: null,
    bgm1: null,
    bgm2: null,

    init() {
        // Load mute state from localStorage
        const savedMute = localStorage.getItem('gameMuted');
        this.isMuted = savedMute === 'true';

        // Preload BGM tracks
        this.bgm1 = new Audio('sound/bgmusic1.mp3');
        this.bgm1.loop = true;
        this.bgm1.volume = 0.4; // Soft background music

        this.bgm2 = new Audio('sound/bgmusic2.mp3');
        this.bgm2.loop = true;
        this.bgm2.volume = 0.45;

        // Apply mute status to audio elements
        this.bgm1.muted = this.isMuted;
        this.bgm2.muted = this.isMuted;

        this.updateMuteButtonUI();
    },

    playBgm(trackNum) {
        let newBgm = trackNum === 1 ? this.bgm1 : this.bgm2;
        let oldBgm = trackNum === 1 ? this.bgm2 : this.bgm1;

        if (this.currentBgm === newBgm) return; // Already playing

        // Stop old BGM
        if (oldBgm) {
            oldBgm.pause();
            oldBgm.currentTime = 0;
        }

        // Start new BGM
        this.currentBgm = newBgm;
        if (newBgm) {
            newBgm.muted = this.isMuted;
            newBgm.play().catch(e => {
                console.log("Autoplay blocked: BGM will play on first user interaction.", e);
            });
        }
    },

    playSfx(sfxPath) {
        const sfx = new Audio(`sound/${sfxPath}.mp3`);
        sfx.muted = this.isMuted;
        sfx.volume = 0.6;
        sfx.play().catch(e => console.log("SFX play blocked", e));
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('gameMuted', this.isMuted);

        if (this.bgm1) this.bgm1.muted = this.isMuted;
        if (this.bgm2) this.bgm2.muted = this.isMuted;

        this.updateMuteButtonUI();
    },

    updateMuteButtonUI() {
        const muteIcon = getEl('audio-toggle-icon');
        if (muteIcon) {
            muteIcon.textContent = this.isMuted ? '🔇' : '🔊';
        }
    }
};

// 2. NPC Characters Database (Thai Dialogue & Satirical logic)
const npcDatabase = {
    key: {
        shortName: "น้องคีย์",
        name: "น้องคีย์ (ลูกสาวเจ้าของห้าง)",
        type: "ติดแบรนด์เนม ชอบความลักชัวรี่",
        intro: "สวัสดีค่ะ! วันนี้มาเดินห้างกับเพื่อน หิวน้ำจัง มีเครื่องดื่มเก๋ ๆ แบรนด์พรีเมียมแนะนำไหมคะ ขอแบบถือเดินห้างแล้วดูไฮโซติดเทรนด์นะ!",
        infoCard: "images/scene5_thesis เกม-56.png",
        budget: 300,
        prefColorText: "น้ำตาล (Brown) หรือ เหลืองทอง (Yellow)",
        prefMarketingText: "จำกัดจำนวน (Limited) / ดารา (Influencer)",
        specialRequirementsText: "ต้องใส่ของตกแต่งแก้วอย่างน้อย 1 ชิ้น (ปลอกแก้ว, สติ๊กเกอร์, หรือหลอด)",
        evaluate: function(drink, price, marketing) {
            let maxLimit = 300;
            const preferredColor = drink.color === 'brown' || drink.color === 'yellow';
            const hasDecor = drink.sleeve || drink.sticker || drink.straw;

            const hasLimited = marketing.includes('limited');
            const hasInfluencer = marketing.includes('influencer');
            if (hasLimited) maxLimit += 150;
            if (hasInfluencer) maxLimit += 100;

            if (price < 250) {
                return {
                    success: false,
                    reason: "น้องคีย์มองว่าราคาถูกเกินไป (< 250 C) ไม่ใช่แบรนด์หรู ไม่เหมาะกับลูกเจ้าของห้าง!",
                    dialog: "หืม? แก้วละไม่ถึงสองร้อยบาท? นี่มันน้ำข้างทางรึเปล่าคะเนี่ย? ถูกแบบนี้ขอบายดีกว่าค่ะ เดี๋ยวเพื่อนแซว!"
                };
            } else if (!hasDecor) {
                return {
                    success: false,
                    reason: "น้องคีย์ต้องการแก้วที่มีพร็อบตกแต่ง เพื่อความดูดีมีแบรนด์",
                    dialog: "แก้วโล้น ๆ ไม่มีตราสติ๊กเกอร์หรือปลอกแก้วเลยเหรอคะ? ถือเดินในห้างไม่เก๋เลย ขอผ่านดีกว่าค่ะ"
                };
            } else if (!preferredColor) {
                return {
                    success: false,
                    reason: "น้องคีย์ชอบเครื่องดื่มสีน้ำตาลหรือสีเหลืองทองพรีเมียม",
                    dialog: "สีน้ำสีทึม ๆ แปลก ๆ ไม่ค่อยตรงเทรนด์เลยค่ะ วันนี้อยากกินน้ำสีสวย ๆ ถือเข้าแบรนด์เนมมากกว่า"
                };
            } else if (price > maxLimit) {
                return {
                    success: false,
                    reason: `ราคาสูงเกินงบน้องคีย์ (เพดานงบอยู่ที่ ${maxLimit} C)`,
                    dialog: "โอ้โห! ถึงบ้านหนูจะมีห้าง แต่ราคานี้มันตั้งเกินจริงไปมากเลยนะคะ ขอตัวดีกว่าค่ะ!"
                };
            } else {
                return {
                    success: true,
                    reason: `ยอมจ่าย ${price} C เพราะเครื่องดื่มดูมีแบรนด์ลิมิเต็ดตรงใจ!`,
                    dialog: "ว้าว! แก้วนี้ดูไฮโซลิมิเต็ดมากค่ะ ถือเดินช้อปปิ้งถ่ายรูปสวยแน่เลย เอา 1 แก้วค่า!"
                };
            }
        }
    },
    martin: {
        shortName: "น้องมาติน",
        name: "น้องมาติน (นักเรียนอินเตอร์)",
        type: "ดาว TikTok สายมัทฉะเข้มข้น",
        intro: "หวัดดีครับพี่! ผมเพิ่งเลิกเรียนอินเตอร์มา ร้อนมาก ๆ อยากได้มัทฉะชาเขียวเข้ม ๆ มีเมนูมัทฉะแนะนำไหมครับ? จะเอาไปถ่ายคลิป TikTok แป๊บ!",
        infoCard: "images/scene5_thesis เกม-53.png",
        budget: 200,
        prefColorText: "เขียว (Green) เท่านั้น",
        prefMarketingText: "ดารา (Influencer) / เล่าเรื่องราว (Story)",
        specialRequirementsText: "ไม่มีความต้องการตกแต่งพิเศษ",
        evaluate: function(drink, price, marketing) {
            let maxLimit = 200;
            const preferredColor = drink.color === 'green';

            const hasInfluencer = marketing.includes('influencer');
            const hasStory = marketing.includes('story');
            if (hasInfluencer) maxLimit += 150;
            if (hasStory) maxLimit += 100;

            if (!preferredColor) {
                return {
                    success: false,
                    reason: "น้องมาตินต้องการมัทฉะชาเขียว (สีเขียว) เท่านั้น!",
                    dialog: "เอ่อ... พี่ครับ ผมสายมัทฉะเลิฟเวอร์นะ น้ำสีอื่นที่ไม่ใช่สีเขียวผมไม่กินหรอกครับ ขอบายดีกว่า!"
                };
            } else if (price > maxLimit) {
                return {
                    success: false,
                    reason: `ราคาสูงเกินงบดาว TikTok นักเรียนอินเตอร์ (งบสูงสุด ${maxLimit} C)`,
                    dialog: "โหยพี่! ชาเขียวแก้วแพงขนาดนี้เลยเหรอครับ? ค่าขนมครึ่งวันผมเลยนะเนี่ย ขอผ่านก่อนครับ!"
                };
            } else {
                return {
                    success: true,
                    reason: `ถูกใจมัทฉะชาเขียว และแคมเปญโฆษณา ยอมจ่าย ${price} C!`,
                    dialog: "เย้! มัทฉะเข้มข้นตรงใจมากครับ ถ่ายลง TikTok เพื่อนต้องตามมากดไลก์เพียบแน่ ขอบคุณนะครับพี่!"
                };
            }
        }
    },
    lee: {
        shortName: "น้องลี่",
        name: "น้องลี่ (ติ่งดาราตัวยง)",
        type: "ทุ่มสุดตัวเพื่อดาราโปรด สาย Top-Spender",
        intro: "กรี๊ดดด! สวัสดีค่ะพี่! ร้านนี้มีโปรโมทแบบดาราหรืออินฟลูฯ ที่หนูตามอยู่ไหมคะ? ถ้าเป็นของตามรอยดารา หนูพร้อมทุ่มไม่อั้นเลยค่า!",
        infoCard: "images/scene5_thesis เกม-52.png",
        budget: 250,
        prefColorText: "แดง (Red) หรือ เหลืองทอง (Yellow)",
        prefMarketingText: "ดารา (Influencer) [ต้องโปรโมทดาราเท่านั้น!]",
        specialRequirementsText: "ไม่มีความต้องการตกแต่งพิเศษ",
        evaluate: function(drink, price, marketing) {
            let maxLimit = 250;
            const preferredColor = drink.color === 'red' || drink.color === 'yellow';

            const hasInfluencer = marketing.includes('influencer');
            const hasAds = marketing.includes('ads');
            if (hasInfluencer) maxLimit += 250;
            if (hasAds) maxLimit += 50;

            if (!hasInfluencer) {
                return {
                    success: false,
                    reason: "น้องลี่ต้องการเห็นแคมเปญ Influencer / ดาราโปรโมท เพื่อตามรอย!",
                    dialog: "อุ๊ย... ร้านพี่ไม่มีเมนูดารา/อินฟลูฯ ที่หนูตามโปรโมทเลยเหรอคะ? แบบนี้หนูไม่ตื่นเต้นเลย ขอผ่านดีกว่าค่ะ"
                };
            } else if (!preferredColor) {
                return {
                    success: false,
                    reason: "น้องลี่ชอบเครื่องดื่มสีสดใส (แดง/เหลือง) สำหรับถ่ายรูปคุมโทนสายติ่ง",
                    dialog: "สีน้ำดูจืดทึมไปหน่อยค่ะ ไม่เหมาะเอาไปถ่ายรูปคู่กับสแตนดี้เมนดาราของหนูเลย pass น้าา"
                };
            } else if (price > maxLimit) {
                return {
                    success: false,
                    reason: `ราคาสูงเกินงบ (ขีดจำกัดงบอยู่ที่ ${maxLimit} C)`,
                    dialog: "ว๊ากกก! ถึงหนูจะพร้อมทุ่มเป็น Top-Spender แต่แก้วนี้ราคาแรงเกินงบเก็บเงินกดบัตรคอนเสิร์ตหนูไปนิดค่ะ!"
                };
            } else {
                return {
                    success: true,
                    reason: `ยอมจ่าย ${price} C จัดเต็มเพราะมี Influencers/ดาราที่ชื่นชอบโปรโมท!`,
                    dialog: "กรี๊ดดด! เมนดาราหนูเคยรีวิวแก้วนี้จริงด้วย! แพงแค่ไหนหนูก็ตะโกนจ่ายค่ะ เอามา 1 แก้วด่วน ๆ!"
                };
            }
        }
    },
    aiya: {
        shortName: "น้องอัยยะ",
        name: "น้องอัยยะ (เด็กมหาลัยติดแกลม)",
        type: "สายแกลมตามเทรนด์ฮิต social",
        intro: "สวัสดีค่าาา... พึ่งเลิกคลาสเรียนมาเหนื่อย ๆ อยากหาอะไรจิบติดแกลมเก๋ ๆ ชิค ๆ ตามเทรนด์ฮิตตอนนี้ มีแนะนำไหมคะ?",
        infoCard: "images/scene5_thesis เกม-54.png",
        budget: 200,
        prefColorText: "แดง (Red), เหลืองทอง (Yellow), หรือ เขียว (Green)",
        prefMarketingText: "จำกัดจำนวน (Limited) / โฆษณาออนไลน์ (Ads)",
        specialRequirementsText: "ต้องใส่ของตกแต่งแก้วอย่างน้อย 1 ชิ้น (ปลอกแก้ว, สติ๊กเกอร์, หรือหลอด)",
        evaluate: function(drink, price, marketing) {
            let maxLimit = 200;
            const preferredColor = drink.color === 'red' || drink.color === 'yellow' || drink.color === 'green';
            const hasDecor = drink.sleeve || drink.sticker || drink.straw;

            const hasLimited = marketing.includes('limited');
            const hasAds = marketing.includes('ads');
            if (hasLimited) maxLimit += 150;
            if (hasAds) maxLimit += 100;

            if (!hasDecor) {
                return {
                    success: false,
                    reason: "น้องอัยยะต้องการแก้วที่มีของตกแต่ง เพื่อความติดแกลม",
                    dialog: "อ้าว... ไม่มีของตกแต่งน่ารัก ๆ ติดแก้วเลยเหรอคะ? แบบนี้จิบแล้วไม่รู้สึกติดแกลมเลยอ่ะค่ะ ขอผ่านน้า"
                };
            } else if (!preferredColor) {
                return {
                    success: false,
                    reason: "น้องอัยยะชอบเครื่องดื่มสีสดใสสไตล์แฟชั่น",
                    dialog: "สีน้ำนี้ไม่เข้ากับลุควันนี้เลยค่ะ ถ่ายรูปเช็คอินมหาลัยไม่ชิค ขอตัวก่อนนะคะ"
                };
            } else if (price > maxLimit) {
                return {
                    success: false,
                    reason: `ราคาสูงเกินงบเด็กมหาลัย (งบจำกัดไม่เกิน ${maxLimit} C)`,
                    dialog: "โหยพี่... ตั้งราคาขูดรีดเด็กมหาลัยเกินไปแล้วค่ะ! ราคานี้หนูกินข้าวได้ 3 มื้อเลย ขอผ่านค่ะ!"
                };
            } else {
                return {
                    success: true,
                    reason: `ยอมจ่าย ${price} C เพราะตกแต่งเก๋ตรงเทรนด์ติดแกลม!`,
                    dialog: "ชิคมากกก! แก้วตกแต่งน่ารัก ถือแล้วรู้สึกติดแกลมขึ้นมาเลยค่ะ จัดมา 1 แก้วเลยค่า!"
                };
            }
        }
    }
};

// 3. UI Helpers
function getEl(id) { return document.getElementById(id); }
function showScene(sceneId) {
    document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
    getEl(sceneId).classList.remove('hidden');
}

// Helper to update current NPC UI without forcing scene transition
function populateNPCData() {
    if (!gameState.npcSequence || gameState.npcSequence.length === 0) {
        resetGame();
    }
    if (!gameState.currentDrinkNum || gameState.currentDrinkNum < 1) {
        gameState.currentDrinkNum = 1;
    }
    const npcKey = gameState.npcSequence[gameState.currentDrinkNum - 1] || 'key';
    const npc = npcDatabase[npcKey] || npcDatabase.key;
    gameState.currentNPC = npc;

    if (getEl('npc-coins')) getEl('npc-coins').textContent = gameState.coins;
    if (getEl('npc-revenue')) getEl('npc-revenue').textContent = gameState.totalRevenue;
    updateCustomerHints(npc.shortName || npc.name);

    if (getEl('npc-name')) getEl('npc-name').textContent = npc.name;
    if (getEl('npc-type')) getEl('npc-type').textContent = npc.type;
    if (getEl('npc-dialog-text')) getEl('npc-dialog-text').textContent = npc.intro;

    const avatar = getEl('npc-avatar');
    if (avatar) avatar.style.backgroundImage = `url('images/npc_${npcKey}.png')`;

    if (getEl('npc-scene5-trait-card') && npc.infoCard) {
        getEl('npc-scene5-trait-card').src = npc.infoCard;
    }

    updateDevPanelInfo();
}

// 4. Initialization & Navigation Events
window.addEventListener('DOMContentLoaded', () => {
    // Initialize Audio Manager
    audioManager.init();

    // Initialize game state & shuffle NPC sequence on page load
    resetGame();
    populateNPCData();
    // ALWAYS start on scene-home Title Screen
    showScene('scene-home');

    // Audio Control Button Event
    getEl('btn-audio-toggle').addEventListener('click', () => {
        audioManager.toggleMute();
    });

    // Global Click SFX Delegate Listener
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .ing-circle, .decor-item, .promo-sticker-btn, .btn-confirm-promo, .marketing-card, .shop-selection-hitbox, .shop-choice-btn, .scene9-cost-btn, .scene12-cost-btn, .scene14-cost-btn, .btn-restart-pill, .btn-failed-restart, .btn-close-npc-modal, #btn-scroll-decor, .btn-view-npc-info');
        if (target) {
            if (target.id === 'btn-audio-toggle') return;
            audioManager.playSfx('buttonclick');
        }
    });

    // Scene 1: Home Events
    getEl('btn-home-play').addEventListener('click', () => {
        audioManager.playBgm(1);
        resetGame();
        showScene('scene-tutorial');
    });

    getEl('btn-tutorial-next').addEventListener('click', () => {
        showScene('scene-intro-1');
    });

    getEl('btn-home-credits').addEventListener('click', () => {
        audioManager.playBgm(1);
        getEl('credits-modal').classList.remove('hidden');
    });

    getEl('btn-close-credits').addEventListener('click', () => {
        getEl('credits-modal').classList.add('hidden');
    });

    // Scene 2 Intro Events
    getEl('btn-intro-1-next').addEventListener('click', () => {
        showScene('scene-intro-2');
    });

    getEl('btn-intro-2-next').addEventListener('click', () => {
        setupNPCArrival();
    });

    // Scene 2 Gameplay: Customize Drink Events
    setupCustomizeHandlers();

    // Scene 2 Gameplay: Marketing Events
    setupMarketingHandlers();

    // Scene 2 Gameplay: Pricing Events
    setupPricingKeypadHandlers();

    // Scene 2 Gameplay: NPC Transition
    const btnNpcNext = getEl('btn-npc-next');
    btnNpcNext.addEventListener('click', () => {
        handleNPCOutcomeNext();
    });

    btnNpcNext.addEventListener('mouseenter', () => {
        const retryTooltip = getEl('npc-retry-tooltip-wrapper');
        if (gameState.isRejected && retryTooltip) {
            retryTooltip.classList.remove('hidden');
        }
    });

    btnNpcNext.addEventListener('mouseleave', () => {
        const retryTooltip = getEl('npc-retry-tooltip-wrapper');
        if (retryTooltip) {
            retryTooltip.classList.add('hidden');
        }
    });

    // NPC Info Trait Card Modal View Handlers
    document.querySelectorAll('[data-action="view-npc-info"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (gameState.currentNPC && gameState.currentNPC.infoCard) {
                getEl('npc-info-img').src = gameState.currentNPC.infoCard;
                getEl('npc-info-modal').classList.remove('hidden');
            }
        });
    });

    getEl('npc-info-modal').addEventListener('click', () => {
        getEl('npc-info-modal').classList.add('hidden');
    });

    // Mission Failed Restart Event
    getEl('btn-failed-restart').addEventListener('click', () => {
        audioManager.playBgm(1);
        resetGame();
        showScene('scene-home');
    });

    // Scenes 7, 8, 10 Narrative Transition Events
    getEl('btn-scene7-next').addEventListener('click', () => {
        setupScene10Transition(); // Go to intro screen first!
    });

    getEl('btn-scene10-transition-next').addEventListener('click', () => {
        setupScene10(); // From intro, go to shop choice!
    });

    getEl('btn-scene8-next').addEventListener('click', () => {
        setupScene12(); // Transition from question to chosen shop's cost breakdown!
    });

    // Scene 10 Shop Clicks
    document.querySelectorAll('.shop-choice-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectShop(e.currentTarget.dataset.shop);
        });
    });

    // Scene 11 Click
    getEl('btn-scene11-next').addEventListener('click', () => {
        handleScene11DialogueNext();
    });

    // Scene 12 Clicks
    getEl('btn-scene12-cost').addEventListener('click', () => {
        handleScene12CostReveal();
    });
    getEl('btn-scene12-next').addEventListener('click', () => {
        setupScene13();
    });

    // Scene 13 Click
    getEl('btn-scene13-next').addEventListener('click', () => {
        setupScene14();
    });

    // Scene 14 Clicks
    getEl('btn-scene14-cost').addEventListener('click', () => {
        handleScene14CostReveal();
    });
    getEl('btn-scene14-next').addEventListener('click', () => {
        setupScene15();
    });

    // Scene 15 Restart Click
    getEl('btn-scene15-restart').addEventListener('click', () => {
        audioManager.playBgm(1);
        showScene('scene-home');
    });

    // ==========================================
    // DEVELOPER TOOLS PANEL EVENTS (TESTMODE)
    // ==========================================
    getEl('btn-dev-toggle').addEventListener('click', () => {
        getEl('dev-panel').classList.toggle('hidden');
    });

    getEl('dev-add-coins').addEventListener('click', () => {
        gameState.coins += 500;
        const coinIds = ['custom-coins', 'marketing-coins', 'pricing-coins', 'npc-coins', 'scene11-coins'];
        coinIds.forEach(id => {
            if (getEl(id)) getEl(id).textContent = gameState.coins;
        });
        updateDevPanelInfo();
    });

    getEl('dev-skip-ending').addEventListener('click', () => {
        gameState.totalRevenue = 1200;
        gameState.coins = 1200;
        gameState.currentDrinkNum = 3;
        const detailModal = getEl('promo-detail-modal');
        if (detailModal) detailModal.classList.add('hidden');
        setupScene7();
    });

    getEl('dev-skip-customer').addEventListener('click', () => {
        if (!gameState.currentNPC) return;
        const npc = gameState.currentNPC;
        gameState.price = npc.budget;
        gameState.currentDrink = {
            color: npc.prefColor || 'brown',
            sleeve: npc.requireSleeve || false,
            sticker: npc.requireSticker || false,
            straw: npc.requireStraw || false
        };
        gameState.selectedMarketing = [npc.prefMarketing || 'limited'];
        setupGameplayNPC();
        evaluateNPCPurchase();
    });
});

function updateDevPanelInfo() {
    const devInfo = getEl('dev-npc-prefs');
    if (!devInfo) return;
    if (!gameState.currentNPC) {
        devInfo.innerHTML = 'No active customer';
        return;
    }
    const npc = gameState.currentNPC;
    devInfo.innerHTML = `
        <b>ลูกค้า:</b> ${npc.name}<br>
        <b>งบตั้งต้น:</b> ${npc.budget} C (บวกเพิ่มตามประเภทแคมเปญการตลาด)<br>
        <b>สีที่ชอบ:</b> ${npc.prefColorText}<br>
        <b>แคมเปญที่ชอบ:</b> ${npc.prefMarketingText}<br>
        <b>ความต้องการพิเศษ:</b> ${npc.specialRequirementsText}
    `;
}

// 5. Game Setup & Gameplay Routines

function resetGame() {
    gameState.coins = 200;
    gameState.debt = 0;
    gameState.currentDrinkNum = 1;
    gameState.totalRevenue = 0;
    gameState.drinksHistory = [];
    gameState.selectedMarketing = [];
    gameState.marketingCost = 0;
    gameState.price = 0;
    gameState.gelatoBought = 'ไม่มี';
    gameState.gelatoCost = 0;
    gameState.isRejected = false;
    gameState.isRetrying = false;
    gameState.selectedShop = null;

    // Fisher-Yates shuffle to pick 3 unique NPCs from the 4 available
    const keys = ['key', 'martin', 'lee', 'aiya'];
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    gameState.npcSequence = keys.slice(0, 3);
}

// Scene 7-10 Navigation Functions
function setupScene7() {
    showScene('scene-7');
}

function setupSceneFailed() {
    showScene('scene-failed');
}

function setupScene8() {
    showScene('scene-8');
}

function setupScene9() {
    getEl('scene9-bg-img').src = 'images/scene9_bg.png'; // Show clean shops background
    getEl('scene9-cost-btn-wrapper').classList.remove('hidden'); // Show cost button
    getEl('btn-scene9-next').classList.add('hidden'); // Hide next button
    showScene('scene-9');
}

function setupScene10Transition() {
    audioManager.playBgm(2);
    showScene('scene-10-transition');
}

function setupScene10() {
    showScene('scene-10');
}

// NPC Client Hint Helper
function updateCustomerHints(name) {
    if (getEl('custom-customer-hint')) getEl('custom-customer-hint').textContent = name;
    if (getEl('marketing-customer-hint')) getEl('marketing-customer-hint').textContent = name;
    if (getEl('pricing-customer-hint')) getEl('pricing-customer-hint').textContent = name;
    if (getEl('npc-customer-hint')) getEl('npc-customer-hint').textContent = name;
}

// Phase 1: NPC Arrival (Order request before customization)
function setupNPCArrival() {
    gameState.npcPhase = 'arrival';

    // Save coins before starting this customer round (to restore on retry!)
    if (!gameState.isRetrying) {
        gameState.coinsBeforeRound = gameState.coins;
    }
    
    // Reset Stamp Verdict UI and show Next button
    if (getEl('verdict-overlay')) getEl('verdict-overlay').classList.add('hidden');
    if (getEl('btn-npc-next')) getEl('btn-npc-next').classList.remove('hidden');

    populateNPCData();
    showScene('scene-gameplay-npc');
}

// Customizer Screen Initialization
function setupGameplayCustom() {
    // Reset drink selection
    gameState.currentDrink = {
        color: 'brown',
        sleeve: false,
        sticker: false,
        straw: false
    };
    gameState.selectedMarketing = [];
    gameState.marketingCost = 0;
    gameState.price = 0;

    // Update Stats UI
    getEl('custom-coins').textContent = gameState.coins;
    getEl('custom-drink-count').textContent = gameState.currentDrinkNum;

    // Update Customer Hints
    updateCustomerHints(gameState.currentNPC.name);

    // Update Drink Preview Layers
    updateDrinkPreview();

    // Highlight initial color and reset active decorations
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === 'brown');
    });
    document.querySelectorAll('.decor-item').forEach(item => {
        item.classList.remove('active');
    });

    showScene('scene-gameplay-custom');
}

// Pre-composed image mapping logic based on color and decoration selections (Renamed files)
function getDrinkImagePath(color, sleeve, sticker, straw) {
    if (!sleeve && !sticker && !straw) {
        // Base cup
        return `images/drink_${color}.png`;
    }
    
    // Mapping for combinations
    if (color === 'brown') {
        if (sleeve) return 'images/drink_brown_sleeve.png';
        if (sticker) return 'images/drink_brown_sticker.png';
        if (straw) return 'images/drink_brown_straw.png';
    } else if (color === 'yellow') {
        if (sleeve) return 'images/drink_yellow_sleeve.png';
        if (sticker) return 'images/drink_yellow_sticker.png';
        if (straw) return 'images/drink_yellow_straw.png';
    } else if (color === 'red') {
        if (sleeve) return 'images/drink_red_sleeve.png';
        if (sticker) return 'images/drink_red_sticker.png';
        if (straw) return 'images/drink_red_straw.png';
    } else if (color === 'green') {
        if (sleeve) return 'images/drink_green_sleeve.png';
        if (sticker) return 'images/drink_green_sticker.png';
        if (straw) return 'images/drink_green_straw.png';
    }
    return `images/drink_${color}.png`;
}

function updateDrinkPreview() {
    const color = gameState.currentDrink.color;
    const sleeve = gameState.currentDrink.sleeve;
    const sticker = gameState.currentDrink.sticker;
    const straw = gameState.currentDrink.straw;
    
    // Load pre-composed image based on selected combination
    getEl('layer-base').src = getDrinkImagePath(color, sleeve, sticker, straw);

    // Apply color-specific offsets to center all cups on the table perfectly (shifted left and down significantly to touch the tabletop line)
    const canvas = getEl('drink-canvas');
    if (color === 'brown') {
        canvas.style.transform = 'translate(0.8%, 15.2%)';
    } else if (color === 'yellow') {
        canvas.style.transform = 'translate(0.4%, 15.2%)';
    } else if (color === 'green') {
        canvas.style.transform = 'translate(0.8%, 17.2%)';
    } else {
        // Red is baseline
        canvas.style.transform = 'translate(-2.4%, 15.2%)';
    }
}

// Side-scrolling simulation for decorations list
let isScrolled = false;
function setupCustomizeHandlers() {
    // Color Buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            const currentBtn = e.currentTarget;
            currentBtn.classList.add('active');
            gameState.currentDrink.color = currentBtn.dataset.color;
            updateDrinkPreview();
        });
    });

    // Decoration Checkbox List (Single Selection)
    document.querySelectorAll('.decor-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const currentItem = e.currentTarget;
            const decorType = currentItem.dataset.decor;
            const wasActive = currentItem.classList.contains('active');
            
            // Clear all active decors in UI and state
            document.querySelectorAll('.decor-item').forEach(item => {
                item.classList.remove('active');
            });
            gameState.currentDrink.sleeve = false;
            gameState.currentDrink.sticker = false;
            gameState.currentDrink.straw = false;

            if (!wasActive) {
                currentItem.classList.add('active');
                gameState.currentDrink[decorType] = true;
            }
            updateDrinkPreview();
        });
    });

    // Scroll button click handler
    getEl('btn-scroll-decor').addEventListener('click', () => {
        const decorList = getEl('decor-list');
        isScrolled = !isScrolled;
        if (isScrolled) {
            decorList.style.transform = 'translateY(-120px)';
        } else {
            decorList.style.transform = 'translateY(0)';
        }
    });

    // Click Next button to transition to Marketing
    getEl('btn-custom-next').addEventListener('click', () => {
        setupGameplayMarketing();
    });
}

let tempSelectedPromo = null;

// Marketing Campaign Screen Setup
function setupGameplayMarketing() {
    gameState.selectedMarketing = [];
    gameState.marketingCost = 0;
    tempSelectedPromo = null;

    // Update Coin Stats
    if (getEl('marketing-coins')) getEl('marketing-coins').textContent = gameState.coins;
    if (getEl('marketing-drink-count')) getEl('marketing-drink-count').textContent = gameState.currentDrinkNum;

    // Hide detail modal if open
    const detailModal = getEl('promo-detail-modal');
    if (detailModal) detailModal.classList.add('hidden');

    showScene('scene-gameplay-marketing');
}

function setupMarketingHandlers() {
    const promoImageMap = {
        limited: 'images/promo_card_limited.png',
        ads: 'images/promo_card_ads.png',
        influencer: 'images/promo_card_influencer.png',
        story: 'images/promo_card_story.png'
    };

    // Click on promo sticker icon button
    document.querySelectorAll('.promo-sticker-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const campaign = e.currentTarget.dataset.campaign;
            const cost = parseInt(e.currentTarget.dataset.cost);

            tempSelectedPromo = { campaign, cost };
            const imgEl = getEl('promo-detail-img');
            if (imgEl) imgEl.src = promoImageMap[campaign];
            const modalEl = getEl('promo-detail-modal');
            if (modalEl) modalEl.classList.remove('hidden');
        });
    });

    // Click on the pink 'เลือก' button overlay to confirm selection
    const confirmBtn = getEl('btn-confirm-promo');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!tempSelectedPromo) return;

            if (gameState.coins < tempSelectedPromo.cost) {
                alert("เหรียญเงินลงทุนของคุณไม่เพียงพอสำหรับวิธีโฆษณานี้!");
                return;
            }

            gameState.selectedMarketing = [tempSelectedPromo.campaign];
            gameState.marketingCost = tempSelectedPromo.cost;
            gameState.coins -= tempSelectedPromo.cost;

            const modalEl = getEl('promo-detail-modal');
            if (modalEl) modalEl.classList.add('hidden');
            setupGameplayPricing();
        });
    }

    // Close modal on clicking outside the card image (backdrop click)
    const detailModal = getEl('promo-detail-modal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                detailModal.classList.add('hidden');
            }
        });
    }

    // Next button on scene 6 to proceed without selecting a new campaign
    const nextBtn = getEl('btn-marketing-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            gameState.selectedMarketing = [];
            gameState.marketingCost = 0;
            setupGameplayPricing();
        });
    }
}

let pricingInput = ""; // Global state for cashier keypad to prevent freeze between rounds

// Cashier Pricing Screen Setup
function setupGameplayPricing() {
    // Reset pricing digit display
    gameState.price = 0;
    getEl('price-display').textContent = '0';
    pricingInput = ""; // Reset input buffer for keypad!

    // Update Stats
    getEl('pricing-coins').textContent = gameState.coins;
    getEl('pricing-drink-count').textContent = gameState.currentDrinkNum;

    // Clone layered cup preview to the cashier register
    const miniCanvas = getEl('pricing-mini-canvas');
    miniCanvas.innerHTML = '';
    
    // Add pre-composed drink image
    const baseImg = document.createElement('img');
    const color = gameState.currentDrink.color;
    const sleeve = gameState.currentDrink.sleeve;
    const sticker = gameState.currentDrink.sticker;
    const straw = gameState.currentDrink.straw;
    
    baseImg.src = getDrinkImagePath(color, sleeve, sticker, straw);
    baseImg.className = 'drink-layer';
    miniCanvas.appendChild(baseImg);

    // Set a random devil hint bubble image and assign position based on tail direction
    const hintImg = getEl('pricing-hint-bubble-img');
    const hintWrapper = getEl('pricing-hint-bubble-wrapper');
    if (hintImg && hintWrapper) {
        const randomNum = Math.floor(Math.random() * 6) + 1;
        hintImg.src = `images/hint_bubble_${randomNum}.png`;
        
        // Clear previous classes
        hintWrapper.classList.remove('pos-left', 'pos-right');
        
        // Bubbles 3, 4, 6 have tails pointing RIGHT (so position them on the LEFT side of the calculator)
        // Bubbles 1, 2, 5 have tails pointing LEFT (so position them on the RIGHT side of the calculator)
        if ([3, 4, 6].includes(randomNum)) {
            hintWrapper.classList.add('pos-left');
        } else {
            hintWrapper.classList.add('pos-right');
        }
    }

    showScene('scene-gameplay-pricing');
}

function setupPricingKeypadHandlers() {
    document.querySelectorAll('.key-btn[data-val]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const digit = e.target.dataset.val;
            
            // Limit price string to 3 digits (Max 999 C)
            if (pricingInput.length >= 3) return;
            if (pricingInput === "" && digit === "0") return; // No leading zero
            
            pricingInput += digit;
            getEl('price-display').textContent = pricingInput;
            gameState.price = parseInt(pricingInput);
        });
    });

    getEl('btn-pricing-clear').addEventListener('click', () => {
        pricingInput = "";
        getEl('price-display').textContent = '0';
        gameState.price = 0;
    });

    getEl('btn-pricing-backspace').addEventListener('click', () => {
        pricingInput = pricingInput.slice(0, -1);
        getEl('price-display').textContent = pricingInput === "" ? "0" : pricingInput;
        gameState.price = pricingInput === "" ? 0 : parseInt(pricingInput);
    });

    getEl('btn-pricing-submit').addEventListener('click', () => {
        if (gameState.price <= 0) {
            alert("กรุณาตั้งราคาขายที่มากกว่า 0 C!");
            return;
        }
        setupGameplayNPC();
    });
}

// Phase 1: NPC Arrival (Order request before customization)
// Duplicate setupNPCArrival removed to fix customer sync bug

// Phase 2: NPC Checkout Evaluation (runs after cashier checkout is submitted)
function setupGameplayNPC() {
    gameState.npcPhase = 'evaluation';
    
    // Reset Stamp Verdict UI and hide next button temporarily
    getEl('verdict-overlay').classList.add('hidden');
    getEl('btn-npc-next').classList.add('hidden');

    // Update Stats
    getEl('npc-coins').textContent = gameState.coins;
    getEl('npc-revenue').textContent = gameState.totalRevenue;

    showScene('scene-gameplay-npc');

    // Automatically trigger evaluation stamp after a short delay
    setTimeout(() => {
        evaluateNPCPurchase();
    }, 1500);
}

function evaluateNPCPurchase() {
    const npc = gameState.currentNPC;
    const result = npc.evaluate(gameState.currentDrink, gameState.price, gameState.selectedMarketing);

    // Show Dialog Response if element exists
    if (getEl('npc-dialog-text')) getEl('npc-dialog-text').textContent = result.dialog;

    // Show stamp overlay
    const overlay = getEl('verdict-overlay');
    const stamp = getEl('verdict-stamp');
    const reason = getEl('verdict-reason');
    const coinsAnim = getEl('verdict-coins-anim');

    overlay.classList.remove('hidden');
    reason.textContent = result.reason;

    if (result.success) {
        overlay.className = "verdict-overlay sold";
        stamp.textContent = "SOLD";
        coinsAnim.textContent = `+${gameState.price} C`;
        coinsAnim.classList.remove('hidden');
        
        // Play coin sound effect on sale
        audioManager.playSfx('coins');

        // Add to statistics
        gameState.coins += gameState.price;
        gameState.totalRevenue += gameState.price;
        getEl('npc-coins').textContent = gameState.coins;
        getEl('npc-revenue').textContent = gameState.totalRevenue;
        gameState.isRejected = false;
    } else {
        overlay.className = "verdict-overlay rejected";
        stamp.textContent = "REJECTED";
        coinsAnim.classList.add('hidden');
        gameState.isRejected = true;

        // Play reject sound effect
        audioManager.playSfx('reject');
    }

    // Keep drink in history
    gameState.drinksHistory.push({
        drinkNum: gameState.currentDrinkNum,
        color: gameState.currentDrink.color,
        sleeve: gameState.currentDrink.sleeve,
        sticker: gameState.currentDrink.sticker,
        straw: gameState.currentDrink.straw,
        price: gameState.price,
        success: result.success,
        npc: npc.name
    });

    // Show Next button
    getEl('btn-npc-next').classList.remove('hidden');
}

function handleNPCOutcomeNext() {
    if (gameState.npcPhase === 'arrival') {
        // From arrival -> proceed to customize
        setupGameplayCustom();
    } else {
        // From evaluation -> proceed to next drink or checkout
        if (gameState.isRejected) {
            gameState.isRetrying = true;
            gameState.isRejected = false;

            // Hide tooltip
            const retryTooltip = getEl('npc-retry-tooltip-wrapper');
            if (retryTooltip) retryTooltip.classList.add('hidden');

            // Restore the money before this customer round started!
            gameState.coins = gameState.coinsBeforeRound;

            // Remove the failed attempt from history since we are retrying it
            gameState.drinksHistory.pop();

            // Clear current round marketing and pricing to start fresh
            gameState.selectedMarketing = [];
            gameState.marketingCost = 0;
            gameState.price = 0;

            // Go back to customer arrival screen so they can choose everything again!
            setupNPCArrival();
            return;
        }

        gameState.isRetrying = false; // Reset retry flag on success path
        if (gameState.currentDrinkNum < 3) {
            gameState.currentDrinkNum++;
            setupNPCArrival();
        } else {
            // Evaluate overall goal of 1000 C
            if (gameState.totalRevenue >= 1000) {
                gameState.coins = gameState.totalRevenue; // Sync coins to total sales revenue!
                setupScene7();
            } else {
                // Trigger Failed Scene
                setupSceneFailed();
            }
        }
    }
}

// Choice-driven Consumer Phase Shop Database (Scenes 10-15)
const shopData = {
    cafe: {
        name: "เจ้าของร้าน คาเฟ่พรีเมียม",
        menuCost: 250,
        itemName: "กาแฟเมล็ดพันธุ์พิเศษสกัดเครื่องชง 100 ปี",
        dialogues: [
            "ยินดีต้อนรับสู่คาเฟ่ระดับรางวัลเวิลด์คลาสของเราครับ! เมนูแนะนำของร้านเราชงจากเครื่องชงโบราณอายุกว่า 100 ปี...",
            "เราสกัดกาแฟออกมาทีละหยดอย่างประณีตเพื่อให้ได้สัมผัสของความหรูหราที่คุณคู่ควรในทุกเช้าวันใหม่ครับ!",
            "รับแก้วนี้เพื่อตอบแทนการทำวิทยานิพนธ์ของคุณไปลิ้มลองดูไหมครับ? ราคาแก้วละ 250 C เท่านั้นครับ!"
        ],
        costImgClean: "images/scene12_ฉาก 12 พื้นหลัง.png",
        costImgComb: "images/scene12_ฉาก 12 รวม คาเฟ่.png"
    },
    bakery: {
        name: "เชฟเบเกอรี่สูตรฝรั่งเศส",
        menuCost: 300,
        itemName: "ครัวซองต์นวดแป้งมือพรีเมียมอบเตาถ่าน",
        dialogues: [
            "สวัสดีครับ! ขนมปังและครัวซองต์สูตรลักชัวรี่ของร้านเรา ผลิตอย่างจำกัดเพียง 10 ชิ้นต่อวันเท่านั้นครับ!",
            "เรานวดแป้งด้วยมืออย่างนุ่มนวลทีละชิ้น และอบด้วยเตาถ่านโบราณนำเข้าเพื่อให้ได้ความกรอบอร่อยล้ำลึก...",
            "เพื่อความพรีเมียมในชีวิตของคุณ ครัวซองต์ร้อนๆ นี้ราคาเพียงชิ้นละ 300 C ครับ ทานดูสักชิ้นไหมครับ?"
        ],
        costImgClean: "images/scene12_ฉาก 12 พื้นหลัง.png",
        costImgComb: "images/scene12_ฉาก 12 รวม ขนมปัง.png"
    },
    matcha: {
        name: "เจ้าของบาร์มัทฉะเกรดพิธีการ",
        menuCost: 200,
        itemName: "มัทฉะอุจินำเข้าเกรดพิธีการชงสดถ้วยต่อถ้วย",
        dialogues: [
            "โอไฮโยโกไซมาสึ! ร้านของเราเสิร์ฟชาเขียวมัทฉะแท้เกรดพิธีการนำเข้าจากดินแดนอูจิประเทศญี่ปุ่นจ้า...",
            "เราใช้แปรงไม้ไผ่ชงสดใหม่ทีละถ้วยอย่างใส่ใจ ร้านของเราฮิตมากในโซเชียลมีเดีย มีอินฟลูเอนเซอร์มาเช็คอินรีวิวเพียบ!",
            "ถ้วยนี้เพื่อความฟินระดับพรีเมียม ราคาพิเศษเพียงแก้วละ 200 C เท่านั้นจ้า สนใจลองแก้วนี้เลยไหมคะ?"
        ],
        costImgClean: "images/scene12_ฉาก 12 พื้นหลัง.png",
        costImgComb: "images/scene12_ฉาก 12 รวม มัทฉะ.png"
    },
    burger: {
        name: "เชฟร้านเบอร์เกอร์วากิวชนชั้นสูง",
        menuCost: 350,
        itemName: "แฮมเบอร์เกอร์วากิวนำเข้าท็อปชีสฝรั่งเศส",
        dialogues: [
            "ยินดีต้อนรับครับ! วันนี้เราคัดสรรเนื้อวัววากิวเกรดพรีเมียมมาย่างบนเตาแบนร้อนๆ เพื่อความชุ่มฉ่ำของเนื้อ...",
            "วัตถุดิบประกอบเกือบทั้งหมดนำเข้าจากฝรั่งเศสเพื่อให้ชนชั้นนำเช่นคุณได้รับความพรีเมียมในมื้อเย็นวันนี้ครับ!",
            "เพื่อรางวัลชีวิตที่เหน็ดเหนื่อย เบอร์เกอร์ชิ้นนี้ราคา 350 C เท่านั้นครับ รับประกันรสชาตินุ่มละมุนลิ้นครับ!"
        ],
        costImgClean: "images/scene12_ฉาก 12 พื้นหลัง.png",
        costImgComb: "images/scene12_ฉาก 12 รวม เบอร์เกอร์.png"
    }
};

let endingDialogueStep = 0;

function selectShop(shopKey) {
    gameState.selectedShop = shopKey;
    const shop = shopData[shopKey];
    if (!shop) return;

    // Set up Scene 11 values
    endingDialogueStep = -1;
    
    // Show corresponding preloaded background image
    document.querySelectorAll('.scene11-bg').forEach(img => img.classList.add('hidden'));
    const targetBg = getEl(`scene11-bg-${shopKey}`);
    if (targetBg) targetBg.classList.remove('hidden');

    // Hide dialogue box initially
    getEl('scene11-dialog-box').classList.add('hidden');

    // Hide the coins-minus indicator initially
    const coinsMinus = getEl('scene11-coins-minus');
    if (coinsMinus) coinsMinus.classList.add('hidden');

    // Set UI HUD stats (full coins, hide debt initially)
    getEl('scene11-coins').textContent = gameState.coins;
    getEl('scene11-debt-indicator').classList.add('hidden');

    // Set Dialogue elements
    getEl('scene11-owner-name').textContent = shop.name;
    getEl('scene11-dialog-text').textContent = shop.dialogues[0];

    // Show corresponding preloaded cost card image
    document.querySelectorAll('.scene12-cost-card-img').forEach(img => img.classList.add('hidden'));
    const targetCard = getEl(`scene12-cost-card-${shopKey}`);
    if (targetCard) targetCard.classList.remove('hidden');

    // Show Scene 11
    showScene('scene-11');
}

function handleScene11DialogueNext() {
    const shop = shopData[gameState.selectedShop];
    if (!shop) return;

    endingDialogueStep++;
    if (endingDialogueStep === 0) {
        // Show dialogue box and set first message
        getEl('scene11-dialog-box').classList.remove('hidden');
        getEl('scene11-dialog-text').textContent = shop.dialogues[0];
    } else if (endingDialogueStep < shop.dialogues.length) {
        // Show subsequent messages
        getEl('scene11-dialog-text').textContent = shop.dialogues[endingDialogueStep];
    } else {
        // Dialogue complete! Perform coin deduction and show red minus animation
        const deductCoins = shop.menuCost;
        gameState.coins -= deductCoins;

        // Play coin sound on premium item purchase
        audioManager.playSfx('coins');

        let incurredDebt = 0;
        if (gameState.coins < 0) {
            incurredDebt = Math.abs(gameState.coins);
            gameState.debt += incurredDebt;
            gameState.coins = 0;
        }

        // Show red minus floating indicator
        const coinsMinus = getEl('scene11-coins-minus');
        if (coinsMinus) {
            coinsMinus.textContent = `-${deductCoins} C`;
            coinsMinus.classList.remove('hidden');
        }

        // Update UI
        getEl('scene11-coins').textContent = gameState.coins;
        if (gameState.debt > 0) {
            const debtIndicator = getEl('scene11-debt-indicator');
            const debtVal = getEl('scene11-debt-val');
            debtIndicator.classList.remove('hidden');
            debtVal.textContent = `-${gameState.debt}`;
        }

        // Disable next button temporarily to let animation play
        const btnNext = getEl('btn-scene11-next');
        if (btnNext) btnNext.disabled = true;

        // Proceed to Scene 8 after 1.4 seconds
        setTimeout(() => {
            if (coinsMinus) coinsMinus.classList.add('hidden');
            if (btnNext) btnNext.disabled = false;
            setupScene8();
        }, 1400);
    }
}

function setupScene12() {
    getEl('scene12-bg-img').src = 'images/scene12_ฉาก 12 พื้นหลัง.png';
    getEl('scene12-card-wrapper').classList.add('hidden');
    getEl('scene12-cost-btn-wrapper').classList.remove('hidden');
    getEl('btn-scene12-next').classList.add('hidden');
    showScene('scene-12');
}

function handleScene12CostReveal() {
    getEl('scene12-card-wrapper').classList.remove('hidden');
    getEl('scene12-cost-btn-wrapper').classList.add('hidden');
    getEl('btn-scene12-next').classList.remove('hidden');
}

function setupScene13() {
    showScene('scene-13');
}

function setupScene14() {
    getEl('scene14-bg-img').src = 'images/scene14_ฉาก 14 พื้นหลัง.png';
    getEl('scene14-card-wrapper').classList.add('hidden');
    getEl('scene14-cost-btn-wrapper').classList.remove('hidden');
    getEl('btn-scene14-next').classList.add('hidden');
    showScene('scene-14');
}

function handleScene14CostReveal() {
    getEl('scene14-card-wrapper').classList.remove('hidden');
    getEl('scene14-cost-btn-wrapper').classList.add('hidden');
    getEl('btn-scene14-next').classList.remove('hidden');
}

function setupScene15() {
    showScene('scene-15');
}
