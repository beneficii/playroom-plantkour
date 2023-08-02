import Player from "./player";

export class PowerData {
    constructor(id, imageKey, text, dkey, statDelta) {
        this.imageKey = imageKey;
        this.text = text;
        this.dkey = dkey;
        this.statDelta = statDelta;
        this.id = id;
    }
}

export default class Powerup extends Phaser.GameObjects.Container {
    constructor(cell, x, y, data) {
        const scene = cell.scene;
        super(scene, x * scene.tileSize, y * scene.tileSize);
        this.scene = scene;
        this.powerData = data;
        this.cell = cell;

        // Create the image sprite
        this.image = new Phaser.GameObjects.Sprite(scene, 16, 16, "crops", data.imageKey);
        this.image.setOrigin(0.5);
        this.add(this.image);

        // Create the text
        this.text = new Phaser.GameObjects.Text(scene, scene.tileSize / 2, -scene.tileSize * 0.75, data.text, {
            font: "bold 16px Arial",
            color: '#c878af',
            align: 'center',
        }).setOrigin(0.5);
        //this.text.setShadow(2, 2, '#52393e', 2);
        this.text.setStroke('#52393e', 4);
        this.add(this.text);

        // Set the initial position of the container
        //this.setPosition(x, y);

        // Add the container to the scene
        scene.add.existing(this);

        // Add a floating animation to the text
        scene.tweens.add({
            targets: this.text,
            y: this.text.y - 10,
            duration: 1000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    remove() {
        this.cell.powerup = null;
        this.destroy();
    }

    removeAnimated() {
        this.cell.powerup = null;
        this.text.setVisible(false);

        this.scene.tweens.add({
            targets: this.image,
            scaleX: 2,
            scaleY: 2,
            y: this.image.y - 32 * 2,
            alpha: 0.4,
            duration: 400,
            ease: 'Linear',
            onComplete: () => {
                this.destroy();
            },
        });
    }



    collect(player) {
        const dkey = this.powerData.dkey;
        let value = 0;
        if (dkey == Player.DKEY.SEED) {
            value = this.powerData.statDelta;
        } else {
            let current = player.getValue(dkey);
            value = current + this.powerData.statDelta;
        }

        this.scene.powerupSound.play();

        player.sendStats(dkey, value);
        this.scene.powerupSpots.forEach(spot => {
            const pup = spot.powerup;
            if (!pup) return;

            if (pup === this) pup.removeAnimated();
            else pup.remove();
        });
    }
}