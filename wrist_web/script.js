// AI Wrist Wrestler - Dynamic & AI Connected

const App = {
    state: {
        difficulty: 1,
        lastScore: 0,
        nextInterval: 45,
        timerId: null,
        history: [],
        consecutiveSkips: 0, // Track consecutive skips/exits
        isAutoPaused: false, // Too busy mode
        aiConfig: {
            url: "https://api.openai.com/v1/chat/completions",
            key: "",
            model: "gpt-3.5-turbo"
        },
        currentFeedbackType: null
    },

    init() {
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }

        console.log("App Init...");
        
        const savedDiff = localStorage.getItem('wrist_difficulty');
        const savedScore = localStorage.getItem('wrist_last_score');
        const savedInterval = localStorage.getItem('wrist_next_interval');
        const savedHistory = localStorage.getItem('wrist_history');
        const savedAI = localStorage.getItem('wrist_ai_config');
        const savedSkips = localStorage.getItem('wrist_consecutive_skips');

        if (savedDiff) this.state.difficulty = parseInt(savedDiff);
        if (savedScore) this.state.lastScore = parseInt(savedScore);
        if (savedInterval) this.state.nextInterval = parseInt(savedInterval);
        if (savedHistory) this.state.history = JSON.parse(savedHistory);
        if (savedAI) this.state.aiConfig = JSON.parse(savedAI);
        if (savedSkips) this.state.consecutiveSkips = parseInt(savedSkips);

        this.updateDashboard();
        this.requestNotificationPermission();
        this.scheduleNextReminder(this.state.nextInterval);

        // Events - Safety check for elements
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            // Remove old listeners by cloning
            const newStartBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newStartBtn, startBtn);
            
            newStartBtn.addEventListener('click', () => {
                 console.log("Start Clicked");
                 this.state.consecutiveSkips = 0;
                 localStorage.setItem('wrist_consecutive_skips', 0);
                 this.startGame();
            });
        } else {
            console.error("Start button not found!");
        }
        
        const quitBtn = document.getElementById('quit-btn');
        if (quitBtn) {
            quitBtn.replaceWith(quitBtn.cloneNode(true)); // Clear listeners
            document.getElementById('quit-btn').addEventListener('click', () => {
                console.log("Quit clicked. Current skips:", this.state.consecutiveSkips);
                this.handleSkipOrExit();
                this.stopGame();
            });
        }
    },
    
    handleSkipOrExit() {
        this.state.consecutiveSkips++;
        console.log("Skip count incremented to:", this.state.consecutiveSkips);
        localStorage.setItem('wrist_consecutive_skips', this.state.consecutiveSkips);
        
        if (this.state.consecutiveSkips >= 3) {
            // Use setTimeout to ensure UI updates or alert shows after current stack
            setTimeout(() => {
                const resumeTime = new Date(Date.now() + 4 * 60 * 60 * 1000); 
                const timeStr = `${resumeTime.getHours()}:${resumeTime.getMinutes().toString().padStart(2,'0')}`;
                
                alert(`It seems you are very busy (3 skipped sessions). AI will pause reminders for 4 hours until ${timeStr}.`);
                
                if (this.state.timerId) clearTimeout(this.state.timerId);
                
                // Set simple timeout to resume
                setTimeout(() => {
                    this.state.consecutiveSkips = 0;
                    localStorage.setItem('wrist_consecutive_skips', 0); // Reset storage too
                    this.showNotification(); 
                    this.scheduleNextReminder(this.state.nextInterval);
                }, 4 * 60 * 60 * 1000);
                
                // Update UI
                const statusEl = document.querySelector('#timer-status p');
                if(statusEl) {
                    statusEl.textContent = `AI Paused: Too Busy Mode (Resumes ${timeStr})`;
                    statusEl.style.color = "var(--accent)";
                }
            }, 100);
        }
    },

    updateDashboard() {
        document.getElementById('diff-display').textContent = this.state.difficulty;
        document.getElementById('last-score').textContent = this.state.lastScore;

        // Show paused state if applicable
        if (this.state.consecutiveSkips >= 3) {
             const statusEl = document.querySelector('#timer-status p');
             if(statusEl) {
                 statusEl.textContent = "AI Paused: Too Busy Mode (Resumes in 4h)";
                 statusEl.style.color = "var(--accent)";
             }
        }
    },

    requestNotificationPermission() {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                const statusEl = document.querySelector('#timer-status p');
                if (permission === "granted") {
                    statusEl.textContent = `Notifications Active · ${this.state.nextInterval} min intervals`;
                    statusEl.style.color = 'var(--primary)';
                } else {
                    statusEl.textContent = 'Enable notifications for best experience';
                    statusEl.style.color = 'var(--text-secondary)';
                }
            });
        }
    },

    scheduleNextReminder(minutes) {
        if (this.state.timerId) clearTimeout(this.state.timerId);
        this.state.timerId = setTimeout(() => {
            this.showNotification();
        }, minutes * 60 * 1000);
        
        const statusEl = document.querySelector('#timer-status p');
        if (Notification.permission === 'granted') {
            statusEl.textContent = `Next session in ${minutes} mins`;
        }
    },

    showNotification() {
        if (Notification.permission === "granted") {
            const notif = new Notification("Time to Move", {
                body: "Short wrist activity recommended.",
                icon: "https://emojicdn.elk.sh/⚡" 
            });
            notif.onclick = () => {
                window.focus();
                this.startGame();
            };
        }
    },

    startGame() {
        document.getElementById('dashboard-layer').classList.add('hidden');
        document.getElementById('feedback-modal').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        Game.start(this.state.difficulty);
    },

    stopGame() {
        Game.stop();
        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('dashboard-layer').classList.remove('hidden');
    },

    // Settings
    openSettings() {
        document.getElementById('settings-modal').classList.remove('hidden');
        document.getElementById('api-url').value = this.state.aiConfig.url;
        document.getElementById('api-key').value = this.state.aiConfig.key;
        document.getElementById('api-model').value = this.state.aiConfig.model;
    },

    closeSettings() {
        document.getElementById('settings-modal').classList.add('hidden');
    },

    saveSettings() {
        this.state.aiConfig.url = document.getElementById('api-url').value || "https://api.openai.com/v1/chat/completions";
        this.state.aiConfig.key = document.getElementById('api-key').value;
        this.state.aiConfig.model = document.getElementById('api-model').value || "gpt-3.5-turbo";
        
        localStorage.setItem('wrist_ai_config', JSON.stringify(this.state.aiConfig));
        this.closeSettings();
        alert("Settings Saved!");
    },

    // Feedback Flow
    selectFeedback(type, btn) {
        this.state.currentFeedbackType = type;
        document.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    },

    async submitFeedback() {
        const type = this.state.currentFeedbackType;
        const notes = document.getElementById('user-notes').value;
        const analysisEl = document.getElementById('ai-analysis');
        const btn = document.getElementById('analyze-btn');

        if (!type) {
            alert("Please select a feedback option (Easy/Okay/Pain)");
            return;
        }

        // Logic Updates
        let diff = this.state.difficulty;
        let interval = this.state.nextInterval;
        
        // Simple adaptation first
        if (type === 'pain') {
            diff = Math.max(1, diff - 1);
            interval = Math.min(120, interval + 20);
        } else if (type === 'good') {
            diff = Math.min(5, diff + 1);
        } else {
             // okay
             interval = Math.min(90, interval + 10);
        }

        // AI Call (Via Backend)
        btn.disabled = true;
        // Add spinner HTML
        btn.innerHTML = '<span class="spinner"></span>AI Thinking...';
        
        analysisEl.style.display = 'block';
        analysisEl.textContent = ""; // Clear previous text
        analysisEl.style.color = "var(--text-secondary)";

        try {
            // Call local backend proxy
            const response = await fetch('/api/wrist_analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feedback: type,
                    notes: notes,
                    score: Game.score,
                    difficulty: this.state.difficulty
                })
            });
            
            const data = await response.json();
            if (data.analysis) {
                analysisEl.textContent = data.analysis;
                
                // Sync Interval from Backend (if provided)
                if (data.suggested_interval) {
                    interval = data.suggested_interval;
                }
                
                // Check for Video Recommendation
                if (data.recommendation) {
                    const rec = data.recommendation;
                    const videoHtml = `
                        <div style="margin-top:15px; padding:15px; background:rgba(9, 132, 227, 0.1); border-radius:10px; border:1px solid var(--primary);">
                            <p style="margin:0 0 10px 0; font-weight:bold; color:var(--primary);">
                                如果你感觉不适，可以参考下面的轻量手腕活动。不需要全部完成。
                            </p>
                            <div style="font-size:0.9em;">
                                <a href="${rec.video_url}" target="_blank" style="color:var(--text); text-decoration:none; display:flex; align-items:center;">
                                    <span style="font-size:2em; margin-right:10px;">📺</span>
                                    <div>
                                        <div style="font-weight:bold;">${rec.title}</div>
                                        <div style="color:var(--text-secondary); font-size:0.8em;">${rec.note}</div>
                                    </div>
                                </a>
                            </div>
                        </div>
                    `;
                    analysisEl.innerHTML += videoHtml;
                }

                if (data.is_fallback) {
                    // Silent fallback, no alert
                }
            } else {
                analysisEl.textContent = "AI Analysis Unavailable.";
            }
        } catch (e) {
            console.error("AI Error:", e);
            // Fallback for network/parsing errors in frontend
            // If backend failed completely, simulate a local response
            const localFallback = this.getLocalFallback(type, Game.score, this.state.difficulty);
            analysisEl.textContent = localFallback.text;
             
            // Also sync interval
            if(localFallback.interval) {
                interval = localFallback.interval;
            }
            // analysisEl.textContent = "Connection Failed. Using default logic."; 
        }
        
        btn.textContent = "Done";
        btn.onclick = () => this.finishSession(diff, interval);
        btn.disabled = false;
    },

    // Frontend Mirror of Backend Fallback Logic (Safety Net)
    getLocalFallback(feedback, score, difficulty) {
         let interval = 45;
         let msg = "Great job! Take a break.";
         
         if (feedback === 'pain') {
             interval = 120;
             msg = `Detected high fatigue levels (Difficulty Lv.${difficulty}). Your wrist flexors are likely overstrained. Recommendation: Immediate 15-minute ice compress and rest.`;
         } else if (feedback === 'ok') {
             interval = 60;
             msg = `Performance is stable (Score: ${score}), but efficiency is dropping. Suggest a 5-minute break to shake out tension.`;
         } else {
             interval = 45;
             msg = `Excellent condition! Score ${score} shows peak motor function. You can safely increase intensity next time.`;
         }
         
         return {
             text: msg + `\n\nBased on this, your next reminder time has been adjusted to ${interval} minutes.`,
             interval: interval
         };
    },

    async callAI(feedback, notes, score, level) {
        const prompt = `
        Context: User just finished a wrist wrestling micro-game (35s).
        Stats: Level ${level}, Score ${score.toFixed(0)}.
        User Feedback: ${feedback.toUpperCase()}.
        User Notes: "${notes}".
        
        Task: Analyze the wrist status and provide a brief recommendation (max 2 sentences) for the next rest interval and intensity. Be professional but friendly coach-like.
        `;

        const response = await fetch(this.state.aiConfig.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.aiConfig.key}`
            },
            body: JSON.stringify({
                model: this.state.aiConfig.model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 100
            })
        });

        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        return data.choices[0].message.content;
    },

    finishSession(diff, interval) {
        // Save
        const session = {
            date: Date.now(),
            score: Game.score,
            difficulty: this.state.difficulty,
            feedback: this.state.currentFeedbackType,
            notes: document.getElementById('user-notes').value
        };

        this.state.difficulty = diff;
        this.state.nextInterval = interval;
        this.state.lastScore = Game.score;
        this.state.history.push(session);
        if (this.state.history.length > 20) this.state.history.shift();

        localStorage.setItem('wrist_difficulty', diff);
        localStorage.setItem('wrist_next_interval', interval);
        localStorage.setItem('wrist_last_score', Game.score);
        localStorage.setItem('wrist_history', JSON.stringify(this.state.history));

        // Reset UI
        document.getElementById('feedback-modal').classList.add('hidden');
        document.getElementById('dashboard-layer').classList.remove('hidden');
        document.getElementById('user-notes').value = "";
        document.getElementById('ai-analysis').style.display = 'none';
        document.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('selected'));
        this.state.currentFeedbackType = null;
        
        const btn = document.getElementById('analyze-btn');
        btn.textContent = "Analyze & Finish";
        btn.onclick = () => this.submitFeedback();

        this.updateDashboard();
        this.scheduleNextReminder(interval);
    }
};

const Game = {
    canvas: null,
    ctx: null,
    isPlaying: false,
    score: 0,
    power: 50,
    loopId: null,
    currentTask: null,
    taskQueue: [],
    particles: [],
    shockwaves: [],
    
    tasks: [
        { id: 'edge', name: 'Edge Tap', desc: 'Touch sides', duration: 10 },
        { id: 'circle', name: 'Rotate', desc: 'Clockwise circle', duration: 10 },
        { id: 'hold', name: 'Hold', desc: 'Press both buttons', duration: 10 }
    ],

    start(difficulty) {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.isPlaying = true;
        this.score = 0;
        this.power = 50;
        this.difficulty = difficulty;
        this.particles = [];
        this.shockwaves = [];
        
        this.generateQueue(difficulty);
        
        document.getElementById('score-display').textContent = '0';
        document.getElementById('power-fill').style.width = '50%';
        
        this.nextTask();
        this.loop();
    },

    stop() {
        this.isPlaying = false;
        cancelAnimationFrame(this.loopId);
    },

    generateQueue(diff) {
        let totalTime = 0;
        const maxTotal = 35;
        this.taskQueue = [];
        let safety = 0;
        while (totalTime < maxTotal && safety < 20) {
            safety++;
            const t = this.tasks[Math.floor(Math.random() * this.tasks.length)];
            let dur = Math.max(4, 8 - (diff * 0.5)); 
            if (totalTime + dur > maxTotal) dur = maxTotal - totalTime;
            if (dur < 2) {
                if (this.taskQueue.length > 0) {
                    this.taskQueue[this.taskQueue.length-1].timeLeft += dur;
                    this.taskQueue[this.taskQueue.length-1].maxTime += dur;
                }
                totalTime = maxTotal;
                break;
            }
            this.taskQueue.push({ ...t, timeLeft: dur, maxTime: dur });
            totalTime += dur;
        }
    },

    nextTask() {
        if (this.taskQueue.length === 0) {
            this.finish(true);
            return;
        }
        this.currentTask = this.taskQueue.shift();
        
        const toast = document.getElementById('task-toast');
        toast.textContent = this.currentTask.name;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
        
        this.createShockwave(window.innerWidth/2, window.innerHeight/2, "#0984e3");
        Input.reset();
    },

    finish(win) {
        this.stop();
        if (win) Fireworks.start();
        
        setTimeout(() => {
            if (win) Fireworks.stop();
            document.getElementById('game-container').classList.add('hidden');
            document.getElementById('feedback-modal').classList.remove('hidden');
            
            document.getElementById('result-title').textContent = win ? "Session Complete" : "Try Again";
            document.getElementById('final-score').textContent = Math.floor(this.score);
        }, win ? 2500 : 500); // Delay for fireworks
    },

    loop() {
        if (!this.isPlaying) return;

        // Logic
        if (this.currentTask) {
            this.currentTask.timeLeft -= 1/60;
            const pct = (this.currentTask.timeLeft / this.currentTask.maxTime) * 100;
            document.getElementById('timer-fill').style.width = pct + '%';

            const decay = 0.15 + (this.difficulty * 0.05);
            this.power -= decay;

            if (this.currentTask.id === 'hold') {
                if (Input.lmb && Input.rmb) {
                    this.power += (0.4 + decay); 
                    this.score += 0.5;
                    if (Math.random() > 0.8) {
                         this.createParticles(window.innerWidth/2, window.innerHeight/2 + 100, 1, "#ff9f43");
                    }
                }
            }
            
            if (this.currentTask.timeLeft <= 0) this.nextTask();
        }

        if (this.power <= 0) { this.finish(false); return; }
        if (this.power >= 100) this.power = 100;

        this.draw();
        this.loopId = requestAnimationFrame(() => this.loop());
    },

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        
        this.ctx.clearRect(0, 0, w, h);
        
        // --- Shockwaves ---
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.r += 5;
            s.a -= 0.02;
            if (s.a <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
            this.ctx.strokeStyle = `rgba(9, 132, 227, ${s.a})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // --- Arm Drawing ---
        const cy = h; 
        const maxAngle = Math.PI / 3; 
        const targetAngle = ((50 - this.power) / 50) * maxAngle;
        
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(targetAngle);
        const scale = Math.min(w, h) / 900;
        this.ctx.scale(scale, scale);

        this.drawArm(1, "#2d3436"); 
        this.drawArm(-1, "#b2bec3");

        // Center Pivot
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.arc(0, -450, 30, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.strokeStyle = "#dfe6e9";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();

        // --- Particles ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            this.ctx.fillStyle = p.c;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }

        // UI Updates
        document.getElementById('power-fill').style.width = this.power + '%';
        document.getElementById('score-display').textContent = Math.floor(this.score);
    },

    drawArm(dir, color) {
        this.ctx.save();
        this.ctx.scale(dir, 1);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(120, 0); 
        this.ctx.lineTo(40, -420); 
        this.ctx.lineTo(-20, -420); 
        this.ctx.lineTo(20, 0); 
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(10, -450, 50, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();
    },

    createShockwave(x, y, color) {
        this.shockwaves.push({ x, y, r: 10, a: 1, c: color });
    },

    createParticles(x, y, count, color) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                size: Math.random() * 4 + 2,
                c: color
            });
        }
    }
};

const Fireworks = {
    canvas: null,
    ctx: null,
    particles: [],
    running: false,

    start() {
        this.canvas = document.getElementById('fireworks-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.running = true;
        this.particles = [];
        this.loop();
        
        // Launch periodic fireworks
        this.interval = setInterval(() => {
            this.explode(
                window.innerWidth/2 + (Math.random()-0.5)*window.innerWidth/2,
                window.innerHeight/2 + (Math.random()-0.5)*window.innerHeight/2
            );
        }, 300);
    },

    stop() {
        this.running = false;
        clearInterval(this.interval);
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    explode(x, y) {
        const colors = ['#0984e3', '#d63031', '#fdcb6e', '#00b894', '#6c5ce7'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        for(let i=0; i<50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                gravity: 0.1
            });
        }
    },

    loop() {
        if (!this.running) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Fade effect
        // this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        // this.ctx.fillRect(0,0,this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.life -= 0.02;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }

        requestAnimationFrame(() => this.loop());
    }
};

const Input = {
    x: 0, y: 0,
    lmb: false, rmb: false,
    lastAngle: 0, accumulatedAngle: 0,
    lastSide: null,

    init() {
        window.addEventListener('mousemove', e => this.handleMove(e));
        window.addEventListener('mousedown', e => {
            if (e.button === 0) this.lmb = true;
            if (e.button === 2) this.rmb = true;
        });
        window.addEventListener('mouseup', e => {
            if (e.button === 0) this.lmb = false;
            if (e.button === 2) this.rmb = false;
        });
        window.addEventListener('contextmenu', e => e.preventDefault());
    },

    reset() {
        this.lmb = false;
        this.rmb = false;
        this.accumulatedAngle = 0;
        this.lastSide = null;
    },

    handleMove(e) {
        if (!Game.isPlaying || !Game.currentTask) return;
        
        const x = e.clientX;
        const y = e.clientY;
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (Game.currentTask.id === 'edge') {
            const margin = 150;
            if (x < margin || x > w - margin) {
                const side = x < w/2 ? 'left' : 'right';
                if (this.lastSide && this.lastSide !== side) {
                    Game.power += 5;
                    Game.score += 10;
                    Game.createShockwave(x, y, "rgba(214, 48, 49, 0.5)");
                }
                this.lastSide = side;
            }
        }

        if (Game.currentTask.id === 'circle') {
            const cx = w/2, cy = h/2;
            const angle = Math.atan2(y - cy, x - cx);
            let delta = angle - this.lastAngle;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            if (delta > 0) {
                this.accumulatedAngle += delta;
                if (this.accumulatedAngle > Math.PI * 2) {
                    Game.power += 8;
                    Game.score += 20;
                    this.accumulatedAngle = 0;
                    Game.createShockwave(cx, cy, "rgba(9, 132, 227, 0.3)");
                }
            }
            this.lastAngle = angle;
        }
        this.x = x;
        this.y = y;
    }
};

Input.init();
App.init();
window.app = App;
