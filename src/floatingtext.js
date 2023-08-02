export default class FloatingText extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text) {
        const style = {
            font: "bold 16px Arial",
            color: "#decd95",
        }
        super(scene, x, y, text, style);

        // Add the FloatingText to the scene and enable physics for it
        scene.add.existing(this);

        // Set the initial position and visibility
        this.setPosition(x, y);

        // Set up the animation
        this.setAlpha(1);
        this.scene.tweens.add({
            targets: this,
            y: y - 32 * 0.75,
            alpha: 0.4, // Fade out
            duration: 300, // Animation duration in milliseconds
            onComplete: () => {
                // Destroy the FloatingText object when the animation completes
                this.destroy();
            },
        });
    }
}