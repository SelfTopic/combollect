// Клиент Combollect: экран выбора → арена → экран победы.

import { Application } from "pixi.js";
import { Game } from "./game/controller.ts";
import { byId } from "./ui/dom.ts";
import { showSelect } from "./ui/select.ts";
import "./style.css";

const app = new Application();
await app.init({ resizeTo: window, background: 0x0d1013, antialias: true });
byId("canvas-host").appendChild(app.canvas);

const toSelect = (): void => {
	byId("game").classList.add("hidden");
	showSelect((options) => game.start(options));
};
const game = new Game(app, toSelect);
toSelect();
