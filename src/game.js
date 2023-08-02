import Phaser from "phaser";
import Player from "./player";
import FloatingText from "./floatingtext";
import ProgressBar from "./progressbar";
import { PowerData } from "./powerup";
import Cell from "./cell";
import GamepadInput from "./gamepadinput";


import { onPlayerJoin, insertCoin, isHost, myPlayer, Joystick, setState, getState } from "playroomkit";
import ColorReplacePipelinePlugin from 'phaser3-rex-plugins/plugins/colorreplacepipeline-plugin.js';

const mapHeight = 18;
const mapWidth = 30;
const tileSize = 32;

const u8Null = 255;

function randomSample(arr, num) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

function arrExclude(arr, valueToRemove) {
    const newArray = arr.filter((value) => value !== valueToRemove);
    return newArray;
}

class PlayGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
    }

    preload() {

        this.load.image("tile", "tile.png");
        this.load.image("wall", "wall.png");
        this.load.image("hero", "hero.png");
        this.load.image("water", "water.png");
        this.load.image("fertilizer", "fertilizer.png");
        this.load.spritesheet("crops", "crops.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
        this.load.tilemapTiledJSON("level", "level.json");
        this.load.audio('bg-music', 'happy.mp3');
        this.load.audio('powerup', 'sounds/powerup.ogg');
        for (let i = 1; i <= 9; i++) {
            this.load.audio(`pop${i}`, `sounds/pop${i}.ogg`);
        }
    }

    getCell(x, y) {
        let arr = this.cellArray;
        if (y >= 0 && x >= 0 && y < arr.length && x < arr[y].length) {
            return arr[y][x];
        }

        return null;
    }

    setupSeeds() {
        this.cellArray = [];

        for (let y = 0; y < mapHeight; y++) {
            this.cellArray[y] = [];

            for (let x = 0; x < mapWidth; x++) {
                this.cellArray[y][x] = new Cell(y, x, this);
            }
        }
    }

    addFloater(x, y, text) {
        new FloatingText(this, x, y, text);
    }

    makePlantPowerup(id) {
        const data = this.seedData[id];
        const descr = `${data.name}\ntime: ${data.growTime}\nreward:${data.reward}`;
        return new PowerData(-1, id * 7 + 6, descr, Player.DKEY.SEED, id);
    }

    create() {
        this.tileSize = tileSize;

        this.seedData = [
            { name: "Corrato", id: 0, xWater: 1, growTime: 3, reward: 10 },
            { name: "Tomelone", id: 1, xWater: 2, growTime: 100, reward: 700 },
            { name: "Peanks", id: 2, xWater: 3, growTime: 2, reward: 5 },
            { name: "Cauliviol", id: 3, xWater: 2, growTime: 20, reward: 85 },
            { name: "Bottarries", id: 4, xWater: 1, growTime: 10, reward: 40 },
            { name: "Safruma", id: 5, xWater: 3, growTime: 15, reward: 60 },
            { name: "Mooam", id: 6, xWater: 2, growTime: 9, reward: 45 },
            { name: "Reoin", id: 7, xWater: 1, growTime: 8, reward: 20 },
            { name: "Rocue", id: 8, xWater: 3, growTime: 10, reward: 50 },
            { name: "Sproccili", id: 9, xWater: 2, growTime: 13, reward: 65 },
            { name: "Cacorange", id: 10, xWater: 2, growTime: 11, reward: 55 },
            { name: "Pop Acom", id: 11, xWater: 1, growTime: 9, reward: 45 },
            { name: "Chuf", id: 12, xWater: 3, growTime: 10, reward: 50 },
            { name: "Trevainne", id: 13, xWater: 2, growTime: 12, reward: 60 },
            { name: "Cacerries", id: 14, xWater: 1, growTime: 13, reward: 65 },
            { name: "Aubaba", id: 15, xWater: 3, growTime: 14, reward: 70 },
        ];

        this.enabledSeeds = [0, 1, 2, 3, 4, 5, 7];

        this.powerData = [
            new PowerData(0, 106, "water\narea +1", Player.DKEY.AREA_WATER, +1),
            new PowerData(1, 105, "collect\narea +1", Player.DKEY.AREA_COLLECT, +1),
            new PowerData(2, 107, "plant\narea +1", Player.DKEY.AREA_PLANT, +1),
            new PowerData(3, 105, "speed +1", Player.DKEY.MOVE_SPEED, +50),
            new PowerData(4, 106, "collect\nbonus +5", Player.DKEY.BONUS_COLLECT, +5),
            new PowerData(5, 107, "growth\nspeed +4", Player.DKEY.STR_FERTILIZER, +4),
        ];

        this.powerupSound = this.sound.add('powerup');
        this.popSounds = [];
        for (let i = 1; i <= 9; i++) {
            this.popSounds.push(`pop${i}`);
        }


        this.setupSeeds();
        // setting background color
        this.cameras.main.setBackgroundColor(gameOptions.bgColor);

        // creatin of "level" tilemap
        this.map = this.make.tilemap({ key: "level", tileWidth: 64, tileHeight: 64 });

        // adding tiles to tilemap
        this.tileset = this.map.addTilesetImage("tileset01", "tile");
        //this.tileset = this.map.addTilesetImage("wall", "wall");

        // which layer should we render? That's right, "layer01"
        this.layer = this.map.createLayer("layer01", this.tileset, 0, 0);

        this.layer.setCollisionBetween(0, 1, true);

        // loading level tilemap
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // players and their controllers
        this.players = [];

        onPlayerJoin(async (player) => {
            const joystick = new Joystick(player, {
                type: "dpad",
                buttons: [
                    { id: "jump", label: "JUMP" },
                    { id: "btnTool", label: "TOOL" },
                ]
            });
            let isOwner = player == myPlayer();
            const hero = new Player(
                this,
                this.layer,
                //this.cameras.main.width / 2 + (this.players.length * 20),
                this.cameras.main.width / 2 - 200 + (this.players.length * 50),
                0,
                //440,
                player.getProfile().color.hex,
                joystick,
                player,
                isOwner);

            if (isOwner) {
                this.ownerHero = hero;
            }

            this.players.push({ player, hero, joystick });
            player.onQuit(() => {
                this.players = this.players.filter(({ player: _player }) => _player !== player);
                hero.destroy();
            });
        });

        this.gpad = new GamepadInput(this);

        this.prevFrame = Date.now();
        this.dayStartTime = Date.now();
        //this.dayDuration = 6 * 1000;
        this.dayDuration = 5 * 1000;

        this.maxGold = 10000;
        this.exp = 0;
        this.expGoal = 30;

        this.scoreText = this.add.text(800, 25, "score: 0", {
            font: "bold 16px Arial",
            color: '#d6cfc2',
            align: 'center',
        }).setOrigin(0);
        this.scoreText.setStroke('#524c40', 4);

        //this.timeLeft = 3 * 60 * 1000;
        this.timeLeft = 3 * 60 * 1000;

        this.timerBar = new ProgressBar(
            this,
            20,     // x
            20,     // y
            320,    // width
            30,     // height
            this.timeLeft,    // maxValue
            this.timeLeft,    // initialValue
            0x524c40,   // backgroundColor
            0x9f9279,   // fillBgColor
            0xb7524b,   // fillColor
            "time"
        );

        this.progressDay = new ProgressBar(
            this,
            320 + 60,   // x
            20,         // y
            160,        // width
            30,         // height
            this.dayDuration,    // maxValue
            this.dayDuration,    // initialValue
            0x524c40,   // backgroundColor
            0x9f9279,   // fillBgColor
            0xd4a64a,    // fillColor
            "day"
        );

        this.progressXP = new ProgressBar(
            this,
            320 + 60 + 160 + 60,    // x
            20,     // y
            160,    // width
            30,     // height
            this.exp,        // maxValue
            this.expGoal,    // initialValue
            0x524c40,   // backgroundColor
            0x9f9279,   // fillBgColor
            0x9a4d76,    // fillColor
            "xp"
        );

        this.gameOver = false;

        const powerSpots = [[10, 15], [15, 15], [20, 15]];
        this.powerupSpots = [];
        powerSpots.forEach(([x, y]) => {
            let cell = this.getCell(x, y);
            cell.isForPowerup = true;
            this.powerupSpots.push(cell);
        });

        this.currentDay = 0;
        this.upgradeLevel = 0;
        this.upgradeLevelsUsed = 0;

        this.totalScore = 0;

        this.tutorialText = this.add.text(this.game.config.width / 2, 150, "use WASD to move, space to jump", {
            font: "bold 24px Arial",
            color: '#d6cfc2',
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialText.setStroke('#524c40', 4);

        this.bgMusic = this.sound.add('bg-music', { loop: false, volume: 0.2 });
        this.bgMusic.play();
    }

    setTutorialStep(step) {
        let msg = "";
        switch (step) {
            case 1:
                msg = "Press E or 'Tool' button to switch to water";
                break;
            case 2:
                msg = "Water plants each day to grow";
                break;
            case 3:
                msg = "Collect plants to get score and powerups";
                this.time.delayedCall(10 * 1000, () => {
                    this.setTutorialStep(step + 1);
                });
                break;
        }

        this.tutorialText.text = msg;
    }

    completeTutorialStep(player) {
        player.tutorialStep++;
        player.onlineObj.setState('tutorial', player.tutorialStep);
        if (player == this.ownerHero) {
            this.setTutorialStep(player.tutorialStep);
        }
    }

    playRandomPop() {
        const randomIndex = Phaser.Math.Between(0, this.popSounds.length - 1);
        const randomAudioKey = this.popSounds[randomIndex];
        this.sound.play(randomAudioKey);
    }

    addGold(value, player) {
        //player.scoreGold += value;
        this.totalScore += value;
        player.onlineObj.setState("scoreGold", this.totalScore);
        this.exp += value;
        this.playRandomPop();
        while (this.exp >= this.expGoal) {
            this.exp -= this.expGoal;
            this.expGoal = parseInt(this.expGoal * 1.2 + 50);
            this.upgradeLevel++;
        }
    }

    GG() {
        const background = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x473932);
        background.setOrigin(0);

        // Create the "Game Over" text
        const gameOverText = this.add.text(this.game.config.width / 2, this.game.config.height / 2, `Game Over\n\nscore: ${this.totalScore}`, {
            fontFamily: "Arial",
            fontSize: "72px",
            color: "#c8c0b0",
            align: 'center',
        });
        gameOverText.setOrigin(0.5);
        this.gameOver = true;
    }

    packDayData() {
        let arrId = [];
        let arrProg = [];
        const arr = this.cellArray;

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const cell = arr[y][x];
                let id = u8Null;
                if (cell.seed != null) id = cell.seed.id;
                arrId.push(id);
                arrProg.push(cell.growth);
            }
        }

        setState('dayData', {
            day: this.currentDay,
            time: this.timeLeft,
            lvl: this.upgradeLevel,
            xp: this.exp,
            xpGoal: this.expGoal,
            //arrId: new Uint8Array(arrId),
            //arrProg: new Uint8Array(arrProg),
            arrId: arrId,
            arrProg: arrProg,

        }, true);
    }

    checkForDayData() {
        let data = getState('dayData');
        if (!data) return false;

        let day = data['day'];
        if (day == this.currentDay) return false;
        if (day < this.currentDay) {
            console.error(`Day desync! ${day} < ${this.currentDay}`);
            this.currentDay = day;
            return false;
        }

        this.currentDay = day;
        this.timeLeft = data['time'];
        this.upgradeLevel = data['lvl'];
        this.exp = data['xp'];
        this.expGoal = data['xpGoal'];
        //const arrId = Array.from(data['arrId']);
        //const arrProgress = Array.from(data['arrProg']);

        const arrId = data['arrId'];
        const arrProgress = data['arrProg'];

        const width = mapWidth;
        const height = mapHeight;

        let index = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.cellArray[y][x].setLocal(arrId[index], arrProgress[index]);
                index++;
            }
        }

        this.dayStartTime = Date.now();

        return true;
    }

    calculateDayHost() {
        const arr = this.cellArray;
        for (let y = 0; y < arr.length; y++) {
            for (let x = 0; x < arr[y].length; x++) {
                const cell = arr[y][x];
                cell.calculateDay();
            }
        }
        this.currentDay++;
    }

    calculateDayLocal() {
        // spawn upgrades if you got enough xp
        if (this.upgradeLevelsUsed < this.upgradeLevel && this.powerupSpots[0].powerup == null) {
            this.upgradeLevelsUsed++;
            const powerups = randomSample(this.powerData, this.powerupSpots.length);
            for (let i = 0; i < this.powerupSpots.length; i++) {
                const spot = this.powerupSpots[i];

                if (i == 1 && this.upgradeLevelsUsed > 2) {
                    const randomPlant = randomSample(arrExclude(this.enabledSeeds, this.ownerHero.currentSeed.id), 1)[0];
                    spot.addPowerUp(this.makePlantPowerup(randomPlant));
                } else {
                    const data = powerups[i];
                    spot.addPowerUp(data);
                }
            }
        }
    }

    setInfoText(text, x, y) {
        //this.scoreText.text = text;
    }

    update() {
        if (this.gameOver) return;

        let timePassed = Date.now() - this.prevFrame;
        this.timeLeft -= timePassed;

        let dayTimeLeft = this.dayStartTime + this.dayDuration - Date.now();

        // check things from host
        if (!isHost()) {
            if (getState("isGameOver")) {
                this.GG();
                return;
            }
            if (this.checkForDayData()) {
                this.calculateDayLocal();
            }
        }

        let localPlayer = myPlayer();
        this.players.forEach(({ player, hero }) => {
            let isOwner = player == localPlayer;
            if (isHost()) {
                this.gpad.read(player, hero);
                hero.update();
                player.setState('pos', hero.pos());
            } else {
                const pos = player.getState('pos');
                if (pos) {
                    if (hero.hero.body.x != pos.x) {
                        hero.hero.flipX = hero.hero.body.x > pos.x;
                    }

                    hero.setPos(pos.x, pos.y);
                }
                const tool = player.getState('tool');
                if (tool !== undefined) {
                    hero.tool = tool;
                }

            }
            hero.checkPos(isOwner);
            const stats = player.getState('stats');
            if (stats) hero.setPlayerStats(stats);
            const score = player.getState('scoreGold');
            if (score !== undefined) {
                if (player.scoreGold != score) {
                    player.scoreGold = score;
                    this.scoreText.text = `score: ${score}`;
                }
            }
            if (isOwner) {
                const tutorial = player.getState('tutorial');
                if (tutorial !== undefined) {
                    if (hero.tutorialStep != tutorial) {
                        hero.tutorialStep = tutorial;
                        console.log(`tutorial step: ${tutorial}`);
                        this.setTutorialStep(tutorial);
                    }
                }
            }

        });

        if (isHost()) {
            if (this.timeLeft < 0) {
                setState('isGameOver', true, true);
                this.GG();
                return;
            }

            if (dayTimeLeft <= 0) {
                this.calculateDayHost();
                this.calculateDayLocal();
                this.packDayData();
                this.dayStartTime = Date.now();
            }

        }

        this.gpad.update();

        this.progressXP.setMax(this.expGoal);
        this.progressXP.setValue(this.exp);
        this.timerBar.setValue(this.timeLeft);
        this.progressDay.setValue(dayTimeLeft);

        this.prevFrame = Date.now();
    }
}

let gameOptions = {
    // width of the game, in pixels
    gameWidth: mapWidth * tileSize,
    // height of the game, in pixels
    gameHeight: mapHeight * tileSize,
    // background color
    bgColor: 0x715239
}

// Phaser 3 game configuration
const config = {
    type: Phaser.AUTO,
    width: gameOptions.gameWidth,
    height: gameOptions.gameHeight,
    parent: "container",
    scene: [PlayGame],
    input: {
        gamepad: true,
        keyboard: true,
    },
    //pixelArt: true,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    plugins: {
        global: [{
            key: 'rexColorReplacePipeline',
            plugin: ColorReplacePipelinePlugin,
            start: true
        },
        ]
    }
};

insertCoin().then(() => {
    // creating a new Phaser 3 game instance
    const game = new Phaser.Game(config);
});