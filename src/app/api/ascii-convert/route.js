import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request) {
  try {
    const { imageUrl } = await request.json();
    const username = imageUrl.split('/').pop().split('?')[0];
    
    let imageBuffer = null;

    // DAFTAR JALUR PENYELUNDUPAN FOTO PROFIL
    const endpoints = [
      // Jalur 1: API Widget Twitter (Paling HD kalau tembus)
      { type: 'syndication', url: `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${username}` },
      // Jalur 2: Proxy Twivatar (Seringnya tembus kalau jalur 1 diblokir)
      { type: 'image', url: `https://twivatar.glitch.me/${username}` },
      // Jalur 3: Unavatar free (Limited)
      { type: 'image', url: `https://unavatar.io/twitter/${username}` },
      // Jalur 4: GitHub (If username github same as X)
      { type: 'image', url: `https://github.com/${username}.png` }
    ];

    for (const endpoint of endpoints) {
      if (imageBuffer) break; // Kalau udah dapet foto, stop nyari
      
      try {
        if (endpoint.type === 'syndication') {
          const res = await fetch(endpoint.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const data = await res.json();
          if (data && data.length > 0 && data[0].profile_image_url_https) {
            const highResUrl = data[0].profile_image_url_https.replace('_normal', '_400x400');
            const imgRes = await fetch(highResUrl);
            if (imgRes.ok) {
              imageBuffer = await imgRes.arrayBuffer();
              console.log(`[SUKSES] Dapat foto dari Jalur Widget Twitter`);
            }
          }
        } else {
          const res = await fetch(endpoint.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (res.ok && res.headers.get('content-type')?.includes('image')) {
            imageBuffer = await res.arrayBuffer();
            console.log(`[SUKSES] Dapat foto dari: ${endpoint.url}`);
          }
        }
      } catch (e) {
        console.log(`[GAGAL] Lewati jalur: ${endpoint.url}`);
      }
    }

    // Error Robot
    if (!imageBuffer) {
      console.log(`[INFO] Semua jalur gagal untuk @${username}. Panggil robot!`);
      const diceRes = await fetch(`https://api.dicebear.com/9.x/bottts/png?seed=${username}`);
      imageBuffer = await diceRes.arrayBuffer();
    }

    // PROSES GAMBAR SHARP
    const buffer = Buffer.from(imageBuffer);
    const WIDTH = 90; 

    const { data, info } = await sharp(buffer, { failOnError: false })
      .ensureAlpha()
      .resize(WIDTH, Math.floor(WIDTH * 0.45), { fit: 'fill' }) 
      .grayscale()
      .normalize()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const chars = [' ', ' ', '.', '-', '=', '≡', '■']; 
    let asciiText = '';
    for (let i = 0; i < data.length; i++) {
      asciiText += chars[Math.floor((data[i] / 256) * chars.length)] || ' ';
      if ((i + 1) % info.width === 0) asciiText += '\n';
    }

    const svg = `
      <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="black"/>
        <foreignObject x="0" y="0" width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="color:white; font-family:monospace; font-size:8px; white-space:pre; text-align:center; line-height:1.2; padding-top:50px; margin:0;">${asciiText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </foreignObject>
      </svg>
    `;

    return NextResponse.json({ image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` });
  } catch (err) {
    console.error("API Error Detil:", err.message);
    return NextResponse.json({ error: "Server pusing bang" }, { status: 500 });
  }
}