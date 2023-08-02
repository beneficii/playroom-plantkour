var playerOptions = {
    // player horizontal speed
    playerSpeed: 300,

    // player force
    playerJump: 300,

    playerWallDragMaxVelocity: 50,

    // allow how many jumps (>1 for mid air jumps)
    playerMaxJumps: 1,

    // should be below acceleration. 
    // You can disable "slippery floor" setting by giving ridiculously high value
    playerDrag: 1000,// 9999,

    playerAcceleration: 1500
}


export default class Player {

    static DKEY = {
        MOVE_SPEED: 0,
        BONUS_COLLECT: 1,
        STR_FERTILIZER: 2,
        AREA_COLLECT: 3,
        AREA_PLANT: 4,
        AREA_WATER: 5,
        AREA_FERTILIZE: 6,
        TOOL: 7,
        SEED: 8,
    };

    static keyToPropertyMapping = {
        [Player.DKEY.MOVE_SPEED]: 'moveSpeed',
        [Player.DKEY.BONUS_COLLECT]: 'bonusCollect',
        [Player.DKEY.STR_FERTILIZER]: 'strFertilizer',
        [Player.DKEY.AREA_COLLECT]: 'areaCollect',
        [Player.DKEY.AREA_PLANT]: 'areaPlant',
        [Player.DKEY.AREA_WATER]: 'areaWater',
        [Player.DKEY.AREA_FERTILIZE]: 'areaFertilize',
        [Player.DKEY.TOOL]: 'tool',
    };

    constructor(scene, layerTiles, x, y, playerColor, joystick, onlineObj, isOwner) {
        this.scene = scene;
        this.layer = layerTiles;
        this.onlineObj = onlineObj;
        this.isOwner = isOwner;

        // params

        this.cachedX = -999;
        this.cachedY = -999;

        this.cachedTool = this.tool = 0; // 0 - seed, 1 - water, 2 - fertilizer

        this.moveSpeed = 100;

        this.bonusCollect = 0;
        this.strFertilizer = 1;

        this.areaCollect = 0;
        this.areaPlant = 0;
        this.areaWater = 0;
        this.areaFertilize = 0;

        this.currentSeed = scene.seedData[0];

        this.btnA = false;
        this.btnB = false;
        this.jDir = 0;
        // params

        this.joystick = joystick;
        this.jumpKeyIsDown = false;
        this.jumpKeyDownAt = 0;

        this.switchKeyIsDown = false;

        // adding the hero sprite and replace it's color with playerColor
        this.hero = scene.physics.add.sprite(x, y, "hero");
        scene.plugins.get('rexColorReplacePipeline').add(this.hero, {
            originalColor: 0x2B2FDA,
            newColor: playerColor,
            epsilon: 0.4
        });
        // this.hero = scene.add.rectangle(x, y, 20, 20, playerColor);

        scene.physics.add.existing(this.hero);

        // scene.physics.world.addCollider(this.hero, scene.layer);
        scene.physics.add.collider(this.hero, scene.layer);
        // scene.physics.add.collider(this.hero, scene.layer, null, null, this);

        // setting hero anchor point
        this.hero.setOrigin(0.5);

        this.hero.body.setCollideWorldBounds(true);

        // Set player minimum and maximum movement speed
        this.hero.body.setMaxVelocity(this.moveSpeed, this.moveSpeed * 10);

        // Add drag to the player that slows them down when they are not accelerating
        this.hero.body.setDrag(playerOptions.playerDrag, 0);

        // the hero can jump
        this.canJump = true;

        // hero is in a jump
        this.jumping = false;

        // the hero is not on the wall
        this.onWall = false;

        // score
        this.scoreGold = 0;
        this.tutorialStep = 0;
    }

    getValue(dkey) {
        switch (dkey) {
            case Player.DKEY.MOVE_SPEED:
                return this.moveSpeed;
            case Player.DKEY.BONUS_COLLECT:
                return this.bonusCollect;
            case Player.DKEY.STR_FERTILIZER:
                return this.strFertilizer;
            case Player.DKEY.AREA_COLLECT:
                return this.areaCollect;
            case Player.DKEY.AREA_PLANT:
                return this.areaPlant;
            case Player.DKEY.AREA_WATER:
                return this.areaWater;
            case Player.DKEY.AREA_FERTILIZE:
                return this.areaFertilize;
            case Player.DKEY.TOOL:
                return this.tool;
            case Player.DKEY.SEED:
                return this.currentSeed.id;
            default:
                return null;
        }
    }

    handleJump() {
        // the hero can jump when:
        // canJump is true AND the hero is on the ground (blocked.down)
        // OR
        // the hero is on the wall
        if (this.canJump || this.onWall) {
            // applying jump force
            this.hero.body.setVelocityY(-playerOptions.playerJump);

            // is the hero on a wall and this isn't the first jump (jump from ground to wall)
            // if yes then push to opposite direction
            if (this.onWall && !this.isFirstJump) {
                // flip horizontally the hero
                this.hero.flipX = !this.hero.flipX;

                // change the horizontal velocity too. This way the hero will jump off the wall
                this.hero.body.setVelocityX(this.moveSpeed * (this.hero.flipX ? -1 : 1));
            }

            // hero is not on the wall anymore
            this.onWall = false;
        }
    }

    sendStats(dkey, value) {
        this.onlineObj.setState('stats', [dkey, value], true);
    }

    checkCollect(x, y) {
        const radius = this.areaCollect;

        for (let iy = y - radius; iy <= y + radius; iy++) {
            for (let ix = x - radius; ix <= x + radius; ix++) {
                const cell = this.scene.getCell(ix, iy);
                if (cell == null) continue;

                const seed = cell.seed;
                if (seed == null) continue;

                if (cell.growth >= seed.growTime) {
                    const reward = seed.reward + this.bonusCollect;
                    this.scene.addFloater(x * this.scene.tileSize, y * this.scene.tileSize, `+${reward}`);
                    this.scene.addGold(reward, this);
                    cell.setSeed(null);
                }
            }
        }
    }

    checkPlant(x, y) {
        if (this.tool != 0) return;

        const radius = this.areaPlant;

        for (let iy = y - radius; iy <= y + radius; iy++) {
            for (let ix = x - radius; ix <= x + radius; ix++) {
                const cell = this.scene.getCell(ix, iy);
                if (!cell) continue;

                const seed = cell.seed;
                if (seed) continue;

                cell.setSeed(this.currentSeed);
            }
        }
    }

    checkWater(x, y) {
        if (this.tool != 1) return;

        const radius = this.areaWater;

        for (let iy = y - radius; iy <= y + radius; iy++) {
            for (let ix = x - radius; ix <= x + radius; ix++) {
                const cell = this.scene.getCell(ix, iy);
                if (!cell) continue;

                if (cell.hasWater) continue;

                cell.addWater(this.strFertilizer);
            }
        }
    }

    checkFertilizer(x, y) {
        if (this.tool != 2) return;

        const radius = this.areaFertilize;

        for (let iy = y - radius; iy <= y + radius; iy++) {
            for (let ix = x - radius; ix <= x + radius; ix++) {
                const cell = this.scene.getCell(ix, iy);
                if (!cell) continue;

                if (cell.fertilizer >= this.strFertilizer) continue;

                cell.setFertilizer(this.strFertilizer);
            }
        }
    }

    checkPoweUp(x, y) {
        var cell = this.scene.getCell(x, y);
        if (!cell || !cell.powerup) return;

        cell.powerup.collect(this);
    }

    checkInfo(x, y) {
        const cell = this.scene.getCell(x, y);
        if (!cell) return;
        const seed = cell.seed;

        if (!seed) {
            this.scene.setInfoText("", 0, 0);
            return;
        }

        this.scene.setInfoText(`${seed.name}: ${cell.growth} / ${seed.growTime}`, x, y);
    }

    checkCell() {
        var x = this.cachedX;
        var y = this.cachedY;

        this.checkCollect(x, y);
        this.checkPlant(x, y);
        this.checkWater(x, y);
        this.checkFertilizer(x, y);

        if (this.isOwner) {
            this.checkPoweUp(x, y);
            this.checkInfo(x, y);
        }
    }

    checkPos() {
        // var x = Math.floor(this.pos().x / this.scene.tileSize);
        // var y = Math.floor(this.pos().y / this.scene.tileSize);

        var x = Math.round(this.pos().x / this.scene.tileSize);
        var y = Math.round(this.pos().y / this.scene.tileSize);

        if (x == this.cachedX && y == this.cachedY && this.tool == this.cachedTool) return;
        this.cachedX = x;
        this.cachedY = y;
        this.cachedTool = this.tool;
        this.checkCell();
    }

    pos() {
        return { x: this.hero.body.x, y: this.hero.body.y };
    }

    setPos(x, y) {
        this.hero.body.x = x;
        this.hero.body.y = y;
    }

    setPlayerStats(tuple) {
        const key = tuple[0];
        const value = tuple[1];

        if (key == Player.DKEY.SEED && this.currentSeed.id != value) {
            this.currentSeed = this.scene.seedData[value];
            return;
        }

        if (Player.keyToPropertyMapping.hasOwnProperty(key)) {
            this[Player.keyToPropertyMapping[key]] = value;
        }

        if (key == Player.DKEY.MOVE_SPEED) {
            this.hero.body.setMaxVelocity(this.moveSpeed, this.moveSpeed * 10);
            return;
        }
    }

    body() {
        return this.hero.body;
    }

    destroy() {
        this.hero.destroy();
    }

    getBtnTool() {
        return this.joystick.isPressed("btnTool") || this.btnB;
    }

    getBtnJump() {
        return this.joystick.isPressed("jump") || this.btnA;
    }

    update() {
        // hero on the ground
        if (this.hero.body.blocked.down) {
            // hero can jump
            this.canJump = true;

            // hero not on the wall
            this.onWall = false;
        }

        // hero NOT on the ground and touching a wall on the right
        if (this.hero.body.blocked.right && !this.hero.body.blocked.down) {
            // hero on a wall
            this.onWall = true;

            // drag on wall only if key pressed and going downwards.
            if (this.rightInputIsActive() && this.hero.body.velocity.y > playerOptions.playerWallDragMaxVelocity) {
                this.hero.body.setVelocityY(playerOptions.playerWallDragMaxVelocity);
            }
        }

        if (this.hero.body.blocked.left && !this.hero.body.blocked.down) {
            this.onWall = true;

            // drag on wall only if key pressed and going downwards.
            if (this.leftInputIsActive() && this.hero.body.velocity.y > playerOptions.playerWallDragMaxVelocity) {
                this.hero.body.setVelocityY(playerOptions.playerWallDragMaxVelocity);
            }
        }

        if (this.hero.body.blocked.down || this.onWall) {
            // set total jumps allowed
            this.jumps = playerOptions.playerMaxJumps;
            this.jumping = false;
        } else if (!this.jumping) {
            this.jumps = 0;
        }

        if (this.leftInputIsActive()) {
            // If the LEFT key is down, set the player velocity to move left
            this.hero.body.setAccelerationX(-playerOptions.playerAcceleration);
            this.hero.flipX = true;
        } else if (this.rightInputIsActive()) {
            // If the RIGHT key is down, set the player velocity to move right
            this.hero.body.setAccelerationX(playerOptions.playerAcceleration);
            this.hero.flipX = false;
        } else {
            this.hero.body.setAccelerationX(0);
        }

        if ((this.onWall || this.jumps > 0) && this.spaceInputIsActive(150)) {
            if (this.hero.body.blocked.down)
                this.isFirstJump = true;
            this.handleJump();
            this.jumping = true;
        }

        if (this.spaceInputReleased()) {
            this.isFirstJump = false;
        }

        if (this.jumping && this.spaceInputReleased()) {
            this.jumps--;
            this.jumping = false;
        }

        var btnSwitch = this.getBtnTool();
        if (btnSwitch != this.switchKeyIsDown) {
            this.switchKeyIsDown = btnSwitch;
            if (btnSwitch) {
                this.tool = (this.tool + 1) % 2;
                this.onlineObj.setState('tool', this.tool, true);
                if (this.tutorialStep == 1) this.scene.completeTutorialStep(this);
            }
        }
    }

    spaceInputIsActive(duration) {
        if (!this.jumpKeyIsDown && this.getBtnJump()) {
            if (this.tutorialStep == 0) this.scene.completeTutorialStep(this);
            this.jumpKeyIsDown = true;
            this.jumpKeyDownAt = Date.now();
        }
        return this.jumpKeyIsDown && ((Date.now() - this.jumpKeyDownAt) < duration);
    }

    spaceInputReleased() {
        if (!this.getBtnJump()) {
            this.jumpKeyIsDown = false;
            return true;
        }
        return false;
    }

    rightInputIsActive() {
        return this.joystick.dpad().x === "right" || this.jDir == 1;
    }

    leftInputIsActive() {
        return this.joystick.dpad().x === "left" || this.jDir == -1;
    }
}