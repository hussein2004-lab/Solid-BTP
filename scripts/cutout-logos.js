// One-off: turn the logo JPEGs (solid white / black backgrounds) into
// transparent PNGs by keying out the background, then trimming the margins.
const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "Images_De_Sld");
const OUT = path.join(__dirname, "..", "public", "brand");

async function keyOut(input, output, mode) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels; // 4 (RGBA)

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let a = 255;
    if (mode === "white") {
      const m = Math.min(r, g, b); // whiteness
      if (m >= 245) a = 0;
      else if (m > 206) a = Math.round((255 * (245 - m)) / (245 - 206));
    } else {
      const m = Math.max(r, g, b); // brightness (black bg is low)
      if (m <= 14) a = 0;
      else if (m < 48) a = Math.round((255 * (m - 14)) / (48 - 14));
    }
    data[i + 3] = a;
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .trim({ threshold: 6 })
    .toFile(output);
  console.log("wrote", output);
}

(async () => {
  await keyOut(path.join(SRC, "Logo_Fond.jpeg"), path.join(OUT, "logo-light.png"), "white");
  await keyOut(path.join(SRC, "Logo_Transparant.jpeg"), path.join(OUT, "logo-dark.png"), "black");
})();
