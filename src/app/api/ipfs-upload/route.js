import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { metadata } = await request.json();

    // Tembak data JSON ke IPFS lewat Pinata
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `ASCII_NFT_${Date.now()}.json` }
      }),
    });

    const data = await res.json();
    
    // Balikin URL IPFS pendek ke frontend
    return NextResponse.json({ ipfsUrl: `ipfs://${data.IpfsHash}` });
  } catch (error) {
    console.error("IPFS Error:", error);
    return NextResponse.json({ error: "Gagal upload ke Pinata" }, { status: 500 });
  }
}