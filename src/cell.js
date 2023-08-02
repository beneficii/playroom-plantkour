import { PowerData } from "./powerup";
import Powerup from "./powerup";
const u8Null = 255;

export default class Cell {

    constructor(col, row, scene) {
        const posX = row * scene.tileSize;
        const posY = col * scene.tileSize;
        this.scene = scene;

        this.x = row;
        this.y = col;

        this.hasWater = false;
        this.fertilizer = 0;
        this.growth = 0;
        this.imgWater = scene.add.image(posX, posY, "water");
        this.imgSeed = scene.add.image(posX, posY, "crops");
        this.imgFertilizer = scene.add.image(posX, posY, "fertilizer");

        this.imgWater.setVisible(false);
        this.imgFertilizer.setVisible(false);

        this.imgSeed.setOrigin(0, 0);
        this.imgWater.setOrigin(0, 0);
        this.imgFertilizer.setOrigin(0, 0);

        this.setSeed(null);
        this.powerup = null;
        this.isForPowerup = false;
    }

    addPowerUp(data) {
        if (this.powerup != null) this.powerup.remove();
        this.powerup = new Powerup(this, this.x, this.y, data);
        this.setSeed(null);
    }

    refreshSeed() {
        if (this.isForPowerup) return;
        let seed = this.seed;
        if (seed == null) return;

        let offset = 7 * seed.id;
        if (this.growth >= seed.growTime) {
            this.imgSeed.setFrame(offset + 6);
            const myHero = this.scene.ownerHero;
            console.log(myHero.tutorialStep);
            if (myHero.tutorialStep == 2) this.scene.completeTutorialStep(myHero);
            return;
        }

        let progress = Math.floor(this.growth * 5 / seed.growTime);
        this.imgSeed.setFrame(offset + progress);
    }

    calculateDay() {
        if (this.isForPowerup) return;
        if (this.seed != null) {
            //var progress = (1 + this.fertilizer) * (this.hasWater ? this.seed.xWater : 0);
            //var progress = this.hasWater ? this.fertilizer : 0;// (1 + this.fertilizer) * (this.hasWater ? this.seed.xWater : 0);
            let progress = this.fertilizer;
            this.growth = Math.min(this.seed.growTime, this.growth + progress);
        }

        this.dailyReset();
        this.refreshVisuals();
    }

    dailyReset() {
        this.imgWater.setVisible(false);
        this.imgFertilizer.setVisible(false);
        this.hasWater = false;
        this.fertilizer = 0;
    }

    setLocal(id, progress) {
        this.dailyReset();
        const currentId = this.seed?.id ?? u8Null;
        if (id != currentId) {
            if (id == u8Null) {
                this.setSeed(null);
                return;
            }
            let seedData = this.scene.seedData[id];
            this.setSeed(seedData);
        }

        if (id == u8Null) return;

        this.growth = progress;

        this.refreshVisuals();
    }


    refreshVisuals() {
        this.refreshSeed();
    }

    setSeed(data) {
        this.seed = data;
        const img = this.imgSeed;
        if (data == null) {
            img.setVisible(false);
            return;
        }
        if (this.isForPowerup) return;

        this.growth = 0;

        img.setVisible(true);
        this.refreshSeed();
    }

    setFertilizer(value) {
        if (this.isForPowerup) return;
        this.fertilizer = value;
        this.imgFertilizer.setVisible(true);
    }

    addWater(value) {
        if (this.isForPowerup) return;
        this.hasWater = true;
        if (value > this.fertilizer)
            this.fertilizer = value;
        this.imgWater.setVisible(true);
    }
}