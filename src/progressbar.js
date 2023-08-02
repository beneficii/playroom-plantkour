export default class ProgressBar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height, maxValue, initialValue, backgroundColor, fillBgColor, fillColor, captionText) {
        super(scene);

        this.scene = scene;
        this.x = x;
        this.y = y;
        this.maxValue = maxValue;
        this.currentValue = initialValue;

        let m = 5;

        this.backgroundBar = this.scene.add.rectangle(0, 0, width, height, backgroundColor);
        this.backgroundBar.setOrigin(0, 0);
        this.fillBarArea = this.scene.add.rectangle(m, m, width - m * 2, height - m * 2, fillBgColor);
        this.fillBarArea.setOrigin(0, 0);
        this.fillBar = this.scene.add.rectangle(m, m, 0, height - m * 2, fillColor);
        this.fillBar.setOrigin(0, 0);

        this.caption = this.scene.add.text(width / 2, height / 2, captionText, {
            font: "bold 16px Arial",
            color: "#39433d",
        });
        this.caption.setOrigin(0.5);

        this.add([this.backgroundBar, this.fillBarArea, this.fillBar, this.caption]);

        this.scene.add.existing(this);
    }

    update() {
        const fillWidth = (this.currentValue / this.maxValue) * this.fillBarArea.width;
        this.fillBar.width = fillWidth;
    }

    setValue(value) {
        this.currentValue = Phaser.Math.Clamp(value, 0, this.maxValue);
        this.update();
    }

    setMax(value) {
        this.maxValue = value;
        this.update();
    }
}