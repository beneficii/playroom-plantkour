import { myPlayer } from "playroomkit";

export default class GamepadInput {
    constructor(scene) {
        this.scene = scene;
        this.joystickDir = 0;
        this.buttonAPressed = false;
        this.buttonBPressed = false;
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.eKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.aKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.wKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.scene.input.keyboard.on('keydown', function (event) {
            if (event.key == 't') this.scene.addGold(100, this.scene.ownerHero);
        });
    }

    update() {
        const gamepad = this.scene.input.gamepad.getPad(0);

        let jDir = 0;
        if (this.aKey.isDown) jDir = -1;
        else if (this.dKey.isDown) jDir = 1;

        let buttonA = this.spaceKey.isDown || this.wKey.isDown;
        let buttonB = this.eKey.isDown;

        if (gamepad) {
            let lx = gamepad.leftStick.x;
            if (lx > 0.05) jDir = 1;
            if (lx < -0.05) jDir = -1;

            if (gamepad.A) buttonA = true;
            if (gamepad.B) buttonB = true;
        }

        let player = myPlayer();
        if (buttonA != this.buttonAPressed) {
            this.buttonAPressed = buttonA;
            player.setState('btnA', buttonA);
        }

        if (buttonB != this.buttonBPressed) {
            this.buttonBPressed = buttonB;
            player.setState('btnB', buttonB);
        }

        if (jDir != this.joystickDir) {
            this.joystickDir = jDir;
            player.setState('jDir', jDir);
        }
    }

    read(player, hero) {
        let btnA = player.getState('btnA');
        if (btnA !== undefined) {
            hero.btnA = btnA;
        }

        let btnB = player.getState('btnB');
        if (btnB !== undefined) {
            hero.btnB = btnB;
        }

        let jDir = player.getState('jDir');
        if (jDir !== undefined) {
            hero.jDir = jDir;
        }
    }
}