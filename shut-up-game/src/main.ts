import './style.css';
import { GameApp } from './app/GameApp';

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
if (!canvas) throw new Error('Missing #renderCanvas');

const app = new GameApp(canvas);
app.start();

// Fade out boot overlay once the app is running.
const boot = document.querySelector<HTMLDivElement>('#boot');
if (boot) {
	requestAnimationFrame(() => {
		boot.classList.add('hidden');
		window.setTimeout(() => boot.remove(), 700);
	});
}
