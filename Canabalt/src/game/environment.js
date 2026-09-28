import { loadImage } from './renderer.js';

const assetFiles = {
  wall: new URL('./assets/kenney/buildings/houseGray.png', import.meta.url).href, brick: new URL('./assets/kenney/buildings/houseGrayAlt.png', import.meta.url).href,
  left: new URL('./assets/kenney/buildings/houseGrayMidLeft.png', import.meta.url).href, right: new URL('./assets/kenney/buildings/houseGrayMidRight.png', import.meta.url).href,
  capLeft: new URL('./assets/kenney/buildings/houseGrayTopLeft.png', import.meta.url).href, cap: new URL('./assets/kenney/buildings/houseGrayTopMid.png', import.meta.url).href, capRight: new URL('./assets/kenney/buildings/houseGrayTopRight.png', import.meta.url).href,
  window: new URL('./assets/kenney/buildings/window.png', import.meta.url).href, windowGrid: new URL('./assets/kenney/buildings/windowCheckered.png', import.meta.url).href,
  windowTop: new URL('./assets/kenney/buildings/windowHighTop.png', import.meta.url).href, windowMiddle: new URL('./assets/kenney/buildings/windowHighMid.png', import.meta.url).href, windowBottom: new URL('./assets/kenney/buildings/windowHighBottom.png', import.meta.url).href,
  fence: new URL('./assets/kenney/buildings/fenceLong.png', import.meta.url).href, chimney: new URL('./assets/kenney/buildings/chimneyThin.png', import.meta.url).href,
  wind: new URL('./assets/kenney/buildings/anemometer.png', import.meta.url).href, sign: new URL('./assets/kenney/buildings/signHangingCup.png', import.meta.url).href,
  crate: new URL('./assets/kenney/industrial/platformIndustrial_057.png', import.meta.url).href, barrel: new URL('./assets/kenney/industrial/platformIndustrial_104.png', import.meta.url).href,
  beam: new URL('./assets/kenney/industrial/platformIndustrial_035.png', import.meta.url).href, vent: new URL('./assets/kenney/industrial/platformIndustrial_045.png', import.meta.url).href, pipe: new URL('./assets/kenney/industrial/platformIndustrial_085.png', import.meta.url).href,
  cloud: new URL('./assets/kenney/background/cloud1.png', import.meta.url).href, cloudWide: new URL('./assets/kenney/background/cloud3.png', import.meta.url).href, moon: new URL('./assets/kenney/background/moon_full.png', import.meta.url).href,
};

function surface(w, h) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

// Cache lighting variants once; all bundled source PNGs remain unmodified.
function shade(image, color, strength = 1) {
  const [canvas, ctx] = surface(image.width, image.height);
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = strength; ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Optional city skin. No player hook: your cat renderer can be added independently. */
export async function loadCityEnvironment() {
  const entries = await Promise.all(Object.entries(assetFiles).map(async ([name, url]) =>
    [name, await loadImage(url)]));
  const art = Object.fromEntries(entries);
  const night = Object.fromEntries(entries.map(([name, image]) => [name, shade(image, '#294350', 0.57)]));
  const cloud = shade(art.cloud, '#6e8d97');
  const cloudWide = shade(art.cloudWide, '#6e8d97');
  const litWindow = shade(art.windowGrid, '#e4c18a', 0.66);
  const litTop = shade(art.windowTop, '#e4c18a', 0.62);
  const litMiddle = shade(art.windowMiddle, '#e4c18a', 0.62);
  const litBottom = shade(art.windowBottom, '#e4c18a', 0.62);

  // Reusable city blocks built from the downloaded wall, window and rooftop tiles.
  const blocks = Array.from({ length: 7 }, (_, index) => {
    const cols = 2 + index % 3; const rows = 3 + index % 4;
    const [canvas, ctx] = surface(cols * 56, rows * 56 + 50);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.drawImage(night[row === 0 ? 'cap' : (col + row + index) % 3 ? 'wall' : 'brick'], col * 56, 50 + row * 56, 56, 56);
        if (row > 0) {
          ctx.drawImage((col * 7 + row + index) % 4 === 0 ? litWindow : night.windowGrid, col * 56 + 13, 53 + row * 56, 30, 36);
        }
      }
    }
    ctx.drawImage(night.chimney, 13, 14, 36, 42);
    if (index % 2 === 0) ctx.drawImage(night.wind, cols * 56 - 49, 0, 36, 50);
    else ctx.drawImage(night.vent, cols * 56 - 65, 19, 43, 33);
    return canvas;
  });
  const farBlocks = blocks.map(block => shade(block, '#294352', 0.84));
  const midBlocks = blocks.map(block => shade(block, '#365563', 0.48));

  function facade(ctx, p, info) {
    const { x, y, width, id } = p;
    const tile = 56;
    const firstCol = Math.max(0, Math.floor(-x / tile));
    const lastCol = Math.min(Math.ceil(width / tile), Math.ceil((info.width - x) / tile));
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, info.height - y); ctx.clip();
    for (let col = firstCol; col < lastCol; col++) {
      const tx = x + col * tile;
      for (let row = 0; row < Math.ceil((info.height - y) / tile); row++) {
        const key = row === 0 ? 'cap' : col === 0 ? 'left' : (col + id + row) % 4 === 0 ? 'brick' : 'wall';
        ctx.drawImage(night[key], tx, y + row * tile, tile, tile);
      }
      if (col % 2 === 0) {
        const lit = (col + id) % 3 !== 0;
        const wx = tx + 14;
        ctx.drawImage(lit ? litTop : night.windowTop, wx, y + 35, 33, 33);
        ctx.drawImage(lit ? litMiddle : night.windowMiddle, wx, y + 68, 33, 27);
        ctx.drawImage(lit ? litBottom : night.windowBottom, wx, y + 95, 33, 33);
      }
      if (col % 6 === 3) {
        ctx.drawImage(night.pipe, tx + 33, y + 14, 11, 58);
        ctx.drawImage(night.pipe, tx + 33, y + 72, 11, 58);
      }
    }
    // A dark cornice and a crisp walkable edge keep gaps readable.
    ctx.fillStyle = '#172b36'; ctx.fillRect(x, y + 8, width, 8);
    ctx.fillStyle = '#859f9d'; ctx.fillRect(x, y, width, 3);
    ctx.fillStyle = '#466470'; ctx.fillRect(x, y + 3, width, 5);
    const signX = x + 260;
    if (id % 2 === 0 && signX > -60 && signX < info.width) ctx.drawImage(night.sign, signX, y + 50, 48, 48);
    ctx.restore();
    // Decorative railings are behind the route; unlike solid crates they do not collide.
    ctx.save(); ctx.globalAlpha = 0.42;
    for (let col = firstCol; col < lastCol; col++) {
      if ((col + id) % 9 < 3) ctx.drawImage(night.fence, x + col * tile, y - 24, tile, 27);
    }
    ctx.restore();
  }

  return {
    background(ctx, info) {
      const { width, height } = info;
      const distance = info.reducedMotion ? 0 : info.distance;
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#152935'); sky.addColorStop(0.65, '#395765'); sky.addColorStop(1, '#66827e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#ccddd4';
      for (let i = 0; i < 25; i++) {
        const x = ((i * 151.7 + 32) % width); const y = 28 + ((i * 43.3) % 147);
        ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }
      ctx.globalAlpha = 0.92;
      ctx.drawImage(art.moon, width * 0.79, 68, 58, 58);
      ctx.globalAlpha = 0.19;
      const cloudOffset = distance * 0.035;
      const firstCloud = Math.floor(cloudOffset / 390) - 1;
      for (let i = firstCloud; i < firstCloud + Math.ceil(width / 390) + 3; i++) {
        const x = i * 390 - cloudOffset;
        ctx.drawImage(i % 2 ? cloud : cloudWide, x, 94 + (Math.abs(i) % 3) * 30, 225, 57);
      }
      ctx.globalAlpha = 1;
      for (let layer = 0; layer < 3; layer++) {
        const spacing = [115, 153, 202][layer];
        const scale = [0.68, 0.86, 1.04][layer];
        const offset = distance * [0.10, 0.21, 0.37][layer];
        const first = Math.floor(offset / spacing) - 2;
        const collection = layer === 0 ? farBlocks : layer === 1 ? midBlocks : blocks;
        for (let i = first; i < first + Math.ceil(width / spacing) + 4; i++) {
          const n = ((i * 3 + layer * 2) % 7 + 7) % 7;
          const block = collection[n];
          const base = [358, 416, 479][layer];
          ctx.drawImage(block, i * spacing - offset, base - block.height * scale, block.width * scale, block.height * scale);
        }
      }
      ctx.fillStyle = '#20343e55'; ctx.fillRect(0, 290, width, height - 290);
    },
    platform: facade,
    obstacle(ctx, obstacle) {
      const { x, y, width, height, kind } = obstacle;
      if (kind === 'cylinder') {
        // Crop transparent margins so the visible drum matches the physics bounds.
        ctx.drawImage(art.barrel, 10, 0, 50, 70, x, y, width, height);
      } else ctx.drawImage(art.crate, x, y, width, height);
    },
  };
}
