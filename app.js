// Game configuration and state
const gameConfig = {
    canvasWidth: 900,
    canvasHeight: 600,
    waterLevel: 150,
    fishTypes: [
        {id: "correct1", color: "#4CAF50", points: 1, speed: 1},
        {id: "correct2", color: "#2196F3", points: 1, speed: 1.2},
        {id: "wrong", color: "#F44336", points: 0, speed: 0.8}
    ],
    animations: {
        waveSpeed: 0.02,
        cloudSpeed: 0.3,
        fishSpeed: 0.5,
        hookSpeed: 3
    }
};

class FishingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.gameStarted = false;
        this.gameTime = 0;
        
        // Game objects with proper positioning
        this.waterSurface = this.canvas.height - 450;
        this.boat = { x: 200, y: this.waterSurface - 50, width: 120, height: 40, sway: 0 };
        this.fisherman = { x: 250, y: this.waterSurface - 80, state: 'idle', animFrame: 0 };
        this.rodTip = { x: 285, y: this.waterSurface - 95 };
        
        this.hook = { 
            x: 285, 
            y: this.waterSurface - 90, 
            targetX: 285, 
            targetY: this.waterSurface - 90, 
            isDragging: false, 
            isDropping: false,
            isCasting: false,
            speed: 0,
            originalX: 285,
            originalY: this.waterSurface - 90,
            radius: 8
        };
        
        this.fishes = [];
        this.clouds = [];
        this.splashes = [];
        this.particles = [];
        
        // Wave animation
        this.waveOffset = 0;
        
        // Mouse tracking
        this.mouseDown = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Initialize game objects
        this.initializeClouds();
        this.initializeFishes();
        
        // Bind event handlers
        this.setupEventHandlers();
        
        // Start animation loop
        this.animate();
        
        console.log('Game initialized - Water surface at:', this.waterSurface);
    }
    
    setupEventHandlers() {
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');
        
        startBtn.addEventListener('click', () => this.startGame());
        restartBtn.addEventListener('click', () => this.restartGame());
        
        // Mouse events for hook dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseDown(touch);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove(touch);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleMouseUp(e);
        });
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    handleMouseDown(e) {
        if (!this.gameStarted) return;
        
        const mousePos = this.getMousePos(e);
        const hookDistance = Math.sqrt(
            Math.pow(mousePos.x - this.hook.x, 2) + Math.pow(mousePos.y - this.hook.y, 2)
        );
        
        // Larger hit area for easier grabbing
        if (hookDistance <= this.hook.radius + 10 && !this.hook.isDropping && !this.hook.isCasting) {
            this.hook.isDragging = true;
            this.mouseDown = true;
            this.dragOffset.x = mousePos.x - this.hook.x;
            this.dragOffset.y = mousePos.y - this.hook.y;
            this.canvas.style.cursor = 'grabbing';
            console.log('Started dragging hook at:', mousePos);
        }
    }
    
    handleMouseMove(e) {
        if (!this.gameStarted) return;
        
        const mousePos = this.getMousePos(e);
        
        if (this.hook.isDragging && this.mouseDown) {
            // Update hook position while dragging
            this.hook.x = mousePos.x - this.dragOffset.x;
            this.hook.y = mousePos.y - this.dragOffset.y;
            
            // Keep hook within reasonable bounds
            this.hook.x = Math.max(50, Math.min(this.canvas.width - 50, this.hook.x));
            this.hook.y = Math.max(50, this.hook.y);
        } else {
            // Change cursor when hovering over hook
            const hookDistance = Math.sqrt(
                Math.pow(mousePos.x - this.hook.x, 2) + Math.pow(mousePos.y - this.hook.y, 2)
            );
            
            if (hookDistance <= this.hook.radius + 10 && !this.hook.isDropping && !this.hook.isCasting) {
                this.canvas.style.cursor = 'grab';
            } else if (this.gameStarted) {
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp(e) {
        if (!this.gameStarted || !this.hook.isDragging) return;
        
        console.log('Mouse released - starting cast');
        this.hook.isDragging = false;
        this.hook.isCasting = true;
        this.hook.isDropping = true;
        this.hook.speed = 2;
        this.fisherman.state = 'casting';
        this.mouseDown = false;
        this.canvas.style.cursor = 'default';
    }
    
    startGame() {
        this.gameStarted = true;
        this.gameTime = 0;
        document.getElementById('startBtn').style.display = 'none';
        this.canvas.style.cursor = 'default';
        console.log('Game started!');
    }
    
    restartGame() {
        this.score = 0;
        this.gameStarted = false;
        this.gameTime = 0;
        this.resetHook();
        this.splashes = [];
        this.particles = [];
        this.fishes = [];
        this.initializeFishes();
        this.updateScore();
        document.getElementById('startBtn').style.display = 'inline-block';
        this.canvas.style.cursor = 'default';
        console.log('Game restarted');
    }
    
    resetHook() {
        this.hook.x = this.hook.originalX;
        this.hook.y = this.hook.originalY;
        this.hook.isDragging = false;
        this.hook.isDropping = false;
        this.hook.isCasting = false;
        this.hook.speed = 0;
        this.fisherman.state = 'idle';
        this.mouseDown = false;
        console.log('Hook reset to original position');
    }
    
    initializeClouds() {
        this.clouds = [
            { x: 100, y: 50, width: 80, height: 40, speed: 0.3 },
            { x: 400, y: 30, width: 100, height: 50, speed: 0.2 },
            { x: 700, y: 60, width: 90, height: 45, speed: 0.25 }
        ];
    }
    
    initializeFishes() {
        this.fishes = [];
        const fishCount = 6;
        const waterTop = this.waterSurface + 50;
        const waterBottom = this.canvas.height - 50;
        
        for (let i = 0; i < fishCount; i++) {
            const fishType = gameConfig.fishTypes[Math.floor(Math.random() * gameConfig.fishTypes.length)];
            const fish = {
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * (waterBottom - waterTop - 60) + waterTop + 30,
                width: 40,
                height: 25,
                vx: (Math.random() - 0.5) * 2 * fishType.speed,
                vy: (Math.random() - 0.5) * 0.5,
                type: fishType,
                animFrame: Math.random() * 60,
                direction: Math.random() > 0.5 ? 1 : -1,
                caught: false
            };
            this.fishes.push(fish);
        }
        console.log('Initialized', this.fishes.length, 'fish');
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    showFeedback(text, isSuccess) {
        const overlay = document.getElementById('feedbackOverlay');
        const textElement = document.getElementById('feedbackText');
        
        textElement.textContent = text;
        textElement.className = `feedback-text ${isSuccess ? 'success' : 'error'}`;
        overlay.classList.remove('hidden');
        
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 1500);
    }
    
    checkCollisions() {
        if (!this.hook.isDropping && !this.hook.isCasting) return;
        
        for (let fish of this.fishes) {
            if (fish.caught) continue;
            
            // Check collision between hook and fish
            const fishCenterX = fish.x + fish.width / 2;
            const fishCenterY = fish.y + fish.height / 2;
            const distance = Math.sqrt(
                Math.pow(this.hook.x - fishCenterX, 2) + 
                Math.pow(this.hook.y - fishCenterY, 2)
            );
            
            if (distance < 30) {
                fish.caught = true;
                this.handleFishCaught(fish);
                console.log('Fish caught!', fish.type);
                return;
            }
        }
    }
    
    handleFishCaught(fish) {
        // Stop hook movement
        this.hook.isDropping = false;
        this.hook.isCasting = false;
        
        // Create splash effect
        this.createSplash(this.hook.x, this.waterSurface);
        
        // Handle scoring and feedback
        if (fish.type.points > 0) {
            this.score += fish.type.points;
            this.updateScore();
            this.showFeedback('+1', true);
            console.log('Correct fish caught! Score:', this.score);
        } else {
            this.showFeedback('Wrong Fish!', false);
            console.log('Wrong fish caught!');
        }
        
        // Reset after delay
        setTimeout(() => {
            this.resetHook();
            // Remove caught fish and spawn new one
            const fishIndex = this.fishes.indexOf(fish);
            if (fishIndex > -1) {
                this.fishes.splice(fishIndex, 1);
                this.spawnNewFish();
            }
        }, 2000);
    }
    
    createSplash(x, y) {
        // Create multiple splash rings
        for (let i = 0; i < 3; i++) {
            this.splashes.push({
                x: x,
                y: y,
                size: i * 10,
                maxSize: 50 + (i * 15),
                life: 40 - (i * 5),
                maxLife: 40 - (i * 5),
                delay: i * 5
            });
        }
        
        // Create water droplet particles
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * -6 - 3,
                life: 30,
                maxLife: 30,
                size: Math.random() * 4 + 2,
                gravity: 0.3
            });
        }
        
        console.log('Splash created at:', x, y);
    }
    
    spawnNewFish() {
        const fishType = gameConfig.fishTypes[Math.floor(Math.random() * gameConfig.fishTypes.length)];
        const waterTop = this.waterSurface + 50;
        const waterBottom = this.canvas.height - 50;
        
        const fish = {
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (waterBottom - waterTop - 60) + waterTop + 30,
            width: 40,
            height: 25,
            vx: (Math.random() - 0.5) * 2 * fishType.speed,
            vy: (Math.random() - 0.5) * 0.5,
            type: fishType,
            animFrame: Math.random() * 60,
            direction: Math.random() > 0.5 ? 1 : -1,
            caught: false
        };
        
        this.fishes.push(fish);
        console.log('New fish spawned');
    }
    
    update() {
        this.gameTime++;
        this.waveOffset += gameConfig.animations.waveSpeed;
        
        // Update boat swaying
        this.boat.sway = Math.sin(this.gameTime * 0.02) * 3;
        this.rodTip.x = 285 + this.boat.sway * 0.3;
        this.rodTip.y = this.waterSurface - 95 + this.boat.sway * 0.2;
        
        // Update original hook position with boat sway
        this.hook.originalX = this.rodTip.x;
        this.hook.originalY = this.rodTip.y + 5;
        
        // Update clouds
        for (let cloud of this.clouds) {
            cloud.x += cloud.speed;
            if (cloud.x > this.canvas.width + cloud.width) {
                cloud.x = -cloud.width;
            }
        }
        
        // Update hook dropping animation
        if (this.hook.isDropping && this.hook.isCasting) {
            this.hook.speed += 0.3;
            this.hook.y += this.hook.speed;
            
            // Stop when hook goes deep enough in water or hits bottom
            if (this.hook.y > this.canvas.height - 100) {
                this.hook.isDropping = false;
                setTimeout(() => {
                    if (this.hook.isCasting) {
                        this.resetHook();
                    }
                }, 1000);
            }
        }
        
        // Update fish
        for (let fish of this.fishes) {
            if (fish.caught) continue;
            
            fish.animFrame++;
            fish.x += fish.vx;
            fish.y += fish.vy;
            
            // Boundary checking
            if (fish.x <= 0 || fish.x >= this.canvas.width - fish.width) {
                fish.vx *= -1;
                fish.direction *= -1;
            }
            
            const waterTop = this.waterSurface + 30;
            const waterBottom = this.canvas.height - 30;
            if (fish.y <= waterTop || fish.y >= waterBottom - fish.height) {
                fish.vy *= -1;
            }
            
            // Random direction changes
            if (Math.random() < 0.003) {
                fish.vx = (Math.random() - 0.5) * 2 * fish.type.speed;
                fish.direction = fish.vx > 0 ? 1 : -1;
            }
        }
        
        // Update splashes
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i];
            
            if (splash.delay > 0) {
                splash.delay--;
                continue;
            }
            
            splash.life--;
            splash.size = splash.maxSize * (1 - splash.life / splash.maxLife);
            
            if (splash.life <= 0) {
                this.splashes.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity; // gravity
            particle.vx *= 0.99; // air resistance
            particle.life--;
            
            if (particle.life <= 0 || particle.y > this.canvas.height) {
                this.particles.splice(i, 1);
            }
        }
        
        // Check collisions
        if (this.gameStarted) {
            this.checkCollisions();
        }
    }
    
    drawSky() {
        // Sky gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.waterSurface);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#B0E0E6');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.waterSurface);
        
        // Draw sun
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - 100, 60, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Sun rays
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + this.gameTime * 0.01;
            const rayX = Math.cos(angle) * 35;
            const rayY = Math.sin(angle) * 35;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width - 100 + rayX * 0.8, 60 + rayY * 0.8);
            this.ctx.lineTo(this.canvas.width - 100 + rayX, 60 + rayY);
            this.ctx.stroke();
        }
        
        // Draw clouds
        for (let cloud of this.clouds) {
            this.drawCloud(cloud.x, cloud.y, cloud.width, cloud.height);
        }
    }
    
    drawCloud(x, y, width, height) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(x, y + height/2, height/2, 0, Math.PI * 2);
        this.ctx.arc(x + width/4, y, height/2, 0, Math.PI * 2);
        this.ctx.arc(x + width/2, y + height/3, height/2, 0, Math.PI * 2);
        this.ctx.arc(x + width*3/4, y, height/2, 0, Math.PI * 2);
        this.ctx.arc(x + width, y + height/2, height/2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawWater() {
        // Water background
        const gradient = this.ctx.createLinearGradient(0, this.waterSurface, 0, this.canvas.height);
        gradient.addColorStop(0, '#4169E1');
        gradient.addColorStop(0.5, '#1E90FF');
        gradient.addColorStop(1, '#191970');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.waterSurface, this.canvas.width, this.canvas.height - this.waterSurface);
        
        // Animated waves
        this.ctx.strokeStyle = '#87CEEB';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.6;
        
        for (let wave = 0; wave < 4; wave++) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 4 - wave;
            
            for (let x = 0; x <= this.canvas.width; x += 5) {
                const y = this.waterSurface + Math.sin(x * 0.02 + this.waveOffset + wave * 2) * (10 - wave * 2);
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
        
        // Shore elements
        this.drawShore();
    }
    
    drawShore() {
        // Left shore grass
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < 8; i++) {
            const grassX = i * 6;
            const grassHeight = 15 + Math.sin(this.gameTime * 0.05 + i) * 3;
            this.ctx.fillRect(grassX, this.waterSurface - grassHeight, 3, grassHeight);
        }
        
        // Right shore grass
        for (let i = 0; i < 8; i++) {
            const grassX = this.canvas.width - 50 + i * 6;
            const grassHeight = 15 + Math.sin(this.gameTime * 0.05 + i) * 3;
            this.ctx.fillRect(grassX, this.waterSurface - grassHeight, 3, grassHeight);
        }
    }
    
    drawBoat() {
        const boatY = this.boat.y + this.boat.sway;
        
        // Boat shadow on water
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(this.boat.x - 5, boatY + 35, 130, 8);
        
        // Boat hull
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.boat.x - 10, boatY + 20, 140, 20);
        
        // Boat deck
        this.ctx.fillStyle = '#DEB887';
        this.ctx.fillRect(this.boat.x, boatY + 10, 120, 12);
        
        // Boat cabin
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fillRect(this.boat.x + 10, boatY - 5, 25, 20);
        
        // Boat details
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillRect(this.boat.x + 85, boatY - 5, 25, 20);
        
        // Boat outline
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.boat.x - 10, boatY + 10, 140, 30);
    }
    
    drawFisherman() {
        const fishermanY = this.fisherman.y + this.boat.sway;
        
        // Body
        this.ctx.fillStyle = '#4169E1';
        this.ctx.fillRect(this.fisherman.x, fishermanY + 20, 15, 25);
        
        // Head
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.beginPath();
        this.ctx.arc(this.fisherman.x + 7, fishermanY + 10, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hat
        this.ctx.fillStyle = '#32CD32';
        this.ctx.fillRect(this.fisherman.x + 2, fishermanY + 2, 10, 8);
        this.ctx.fillRect(this.fisherman.x - 2, fishermanY + 8, 14, 2);
        
        // Eyes
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(this.fisherman.x + 5, fishermanY + 8, 1, 0, Math.PI * 2);
        this.ctx.arc(this.fisherman.x + 9, fishermanY + 8, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Fishing rod
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.fisherman.x + 15, fishermanY + 15);
        this.ctx.lineTo(this.rodTip.x, this.rodTip.y);
        this.ctx.stroke();
        
        // Arms
        this.ctx.fillStyle = '#FDBCB4';
        if (this.fisherman.state === 'casting') {
            this.ctx.fillRect(this.fisherman.x + 12, fishermanY + 16, 10, 4);
        } else {
            this.ctx.fillRect(this.fisherman.x + 12, fishermanY + 18, 8, 4);
        }
        
        // Legs
        this.ctx.fillStyle = '#2F4F4F';
        this.ctx.fillRect(this.fisherman.x + 2, fishermanY + 40, 5, 12);
        this.ctx.fillRect(this.fisherman.x + 10, fishermanY + 40, 5, 12);
    }
    
    drawFishingLine() {
        // Draw line from rod tip to hook
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.rodTip.x, this.rodTip.y);
        this.ctx.lineTo(this.hook.x, this.hook.y);
        this.ctx.stroke();
    }
    
    drawHook() {
        // Hook shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.hook.x + 2, this.hook.y + 2, this.hook.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hook body (bright for visibility)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.hook.x, this.hook.y, this.hook.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Hook outline
        this.ctx.strokeStyle = '#B8860B';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Hook point
        this.ctx.fillStyle = '#8B7355';
        this.ctx.beginPath();
        this.ctx.arc(this.hook.x + 3, this.hook.y + 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawFish(fish) {
        if (fish.caught) return;
        
        this.ctx.save();
        this.ctx.translate(fish.x + fish.width/2, fish.y + fish.height/2);
        this.ctx.scale(fish.direction, 1);
        
        // Fish shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.ellipse(2, 2, fish.width/2, fish.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Fish body
        this.ctx.fillStyle = fish.type.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, fish.width/2, fish.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Fish outline
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Fish tail (animated)
        const tailWag = Math.sin(fish.animFrame * 0.3) * 5;
        this.ctx.fillStyle = fish.type.color;
        this.ctx.beginPath();
        this.ctx.moveTo(-fish.width/2, 0);
        this.ctx.lineTo(-fish.width/2 - 12, -8 + tailWag);
        this.ctx.lineTo(-fish.width/2 - 12, 8 + tailWag);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.stroke();
        
        // Fish eye
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(fish.width/4, -fish.height/4, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(fish.width/4, -fish.height/4, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Fish fins
        this.ctx.fillStyle = fish.type.color;
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.ellipse(-5, fish.height/3, 8, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.ctx.restore();
    }
    
    drawSplashes() {
        for (let splash of this.splashes) {
            if (splash.delay > 0) continue;
            
            this.ctx.strokeStyle = '#87CEEB';
            this.ctx.lineWidth = 4;
            this.ctx.globalAlpha = splash.life / splash.maxLife;
            
            // Multiple ripple rings
            this.ctx.beginPath();
            this.ctx.arc(splash.x, splash.y, splash.size, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(splash.x, splash.y, splash.size * 0.7, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawParticles() {
        for (let particle of this.particles) {
            this.ctx.fillStyle = '#87CEEB';
            this.ctx.globalAlpha = particle.life / particle.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add highlight
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.globalAlpha = (particle.life / particle.maxLife) * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(particle.x - particle.size/3, particle.y - particle.size/3, particle.size/3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw all game elements in correct order
        this.drawSky();
        this.drawWater();
        this.drawBoat();
        this.drawFisherman();
        
        // Draw fish (behind fishing line and hook)
        for (let fish of this.fishes) {
            this.drawFish(fish);
        }
        
        this.drawFishingLine();
        this.drawHook();
        this.drawSplashes();
        this.drawParticles();
    }
    
    animate() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FishingGame();
});