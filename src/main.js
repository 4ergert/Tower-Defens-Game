import { createGameKernel } from './game/core/gameKernel.js';
import { createUiBridge } from './game/render/bootstrapUi.js';

const root = document.getElementById('rts-root');
if (!root) {
  throw new Error('Missing #rts-root');
}

const kernel = createGameKernel();
const ui = createUiBridge(root, {
  onCommand(command) {
    kernel.enqueueCommand(command);
  }
});

kernel.subscribe((snapshot) => {
  ui.render(snapshot);
});

kernel.start();

setTimeout(() => {
  document.body.classList.add('cinematic-active');
}, 3000);

window.rtsKernel = kernel;
