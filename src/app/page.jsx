'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

const CONTRACT_ADDRESS = "0xcD36Ae752c14bEB401d94B2bC8a42459A375e5Af";
const EXPLORER_URL = `https://explorer.ritualfoundation.org/address/${CONTRACT_ADDRESS}`;

export default function Home() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState('');
  const [previewUri, setPreviewUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { writeContract, data: hash, isPending: isMintingContract } = useWriteContract();
  const { isLoading: isWaitingForTx, isSuccess: isMintedSuccess } = useWaitForTransactionReceipt({ hash });

  const handleGenerate = async () => {
    if (!username) return;
    setIsLoading(true);
    setPreviewUri(null);
    try {
      const response = await fetch('/api/ascii-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: `https://unavatar.io/twitter/${username}` }),
      });
      const data = await response.json();
      if (data.image) setPreviewUri(data.image);
    } catch (error) { alert("Gagal fetch gambar!"); } finally { setIsLoading(false); }
  };

  const handleMint = async () => {
    if (!address || !previewUri) return;

    try {
      // 1. Siapin Metadata (Gambarnya tetep kita simpen di dalem IPFS)
      const metadata = {
        name: `ASCII MINT - @${username}`,
        description: "Generated ASCII Art on Ritual Network Testnet",
        image: previewUri
      };

      // 2. Upload metadata ke IPFS lewat API kita
      const uploadRes = await fetch('/api/ipfs-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata })
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.ipfsUrl) {
        alert("Gagal nitipin file ke IPFS bang!");
        return;
      }

      // 3. Tembak URL IPFS yang pendek (cuma seiprit) ke Smart Contract
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{ name: 'mintNFT', type: 'function', stateMutability: 'payable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'tokenURI', type: 'string' }], outputs: [{ name: '', type: 'uint256' }] }],
        functionName: 'mintNFT',
        args: [address, uploadData.ipfsUrl],
        value: parseEther('0'),
      });
    } catch (error) {
      console.error(error);
      alert("Ada yang error pas minting!");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono flex flex-col items-center">
      <header className="w-full flex justify-between items-center p-6 border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-black italic tracking-tighter">ASCII.MINT</h1>
          <a href={EXPLORER_URL} target="_blank" className="text-[10px] text-emerald-500 hover:underline hidden sm:block font-bold">
            {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
          </a>
        </div>
        <ConnectButton />
      </header>

      <div className="w-full max-w-3xl px-6 py-12 flex flex-col items-center">
        <p className="text-neutral-500 text-[10px] mb-8 tracking-[0.4em] uppercase font-bold italic">Ritual Testnet Minter</p>

        {/* INPUT BOX */}
        <div className="flex gap-2 w-full max-w-md mb-12 bg-neutral-900 p-1 border border-neutral-800 rounded-2xl shadow-2xl">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600">@</span>
            <input
              type="text" placeholder="username" value={username}
              onChange={(e) => setUsername(e.target.value.replace('@', ''))}
              className="w-full pl-10 pr-4 py-3 bg-transparent text-white focus:outline-none text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
          <button onClick={handleGenerate} disabled={isLoading} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200 transition text-xs">
            {isLoading ? "..." : "PREVIEW"}
          </button>
        </div>

        {/* PREVIEW BOX - Posisi items-start biar nempel ke atas */}
        <div
          className="w-[320px] h-[320px] bg-black border border-neutral-900 flex items-start justify-center overflow-hidden rounded-2xl shadow-2xl mb-12 relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          {previewUri ? (
            <img
              src={previewUri}
              alt="Preview"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <div className="h-full flex items-center">
              <p className="text-neutral-800 text-[10px] uppercase tracking-widest italic">Waiting for signal...</p>
            </div>
          )}
        </div>

        {/* MINT / SUCCESS SECTION */}
        {previewUri && (
          <div className="w-full flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isMintedSuccess ? (
              isConnected ? (
                <button onClick={handleMint} disabled={isWaitingForTx} className="px-12 py-4 bg-white text-black font-black rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95">
                  {isWaitingForTx ? 'MINING ON RITUAL...' : 'MINT NFT NOW'}
                </button>
              ) : (
                <div className="px-10 py-3 border border-yellow-600/50 rounded-full text-yellow-500 text-[10px] tracking-[0.2em] font-bold hover:bg-yellow-600 hover:text-black transition-all cursor-not-allowed">
                  CONNECT WALLET TO MINT
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  🔥 NFT SUCCESSFULLY MINTED!
                </p>

                {/* Link Transaksi (Dibungkus teks) */}
                <a
                  href={`https://explorer.ritualfoundation.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 text-[10px] hover:text-emerald-400 transition-colors underline tracking-widest uppercase mb-2"
                >
                  View Transaction Record
                </a>

                <div className="flex gap-4 mt-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just minted my ASCII PFP @${username} on @ritualnet Testnet! 🔥\n\nTurning raw code into on-chain art. No pixels needed when you can build with pure characters. \n\nGo mint your own ASCII PFP here: https://ritual-ascii.vercel.app`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 border border-white text-[10px] font-bold hover:bg-white hover:text-black transition tracking-widest"
                  >
                    SHARE TO X
                  </a>
                  {/* Tombol Save Image */}
                  <button
                    onClick={() => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        // Set resolusi PNG-nya (misal 800x800 biar tajem)
                        canvas.width = 800;
                        canvas.height = 800;
                        const ctx = canvas.getContext("2d");

                        // Kasih background hitam dulu
                        ctx.fillStyle = "black";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Gambar SVG-nya ke atas canvas
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        // Download hasilnya sebagai PNG
                        const a = document.createElement('a');
                        a.href = canvas.toDataURL("image/png");
                        a.download = `ASCII_${username}.png`;
                        a.click();
                      };
                      img.src = previewUri;
                    }}
                    className="px-8 py-3 border border-white text-[10px] font-bold hover:bg-white hover:text-black transition tracking-widest"
                  >
                    SAVE AS PNG
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-24 pb-12 border-t border-neutral-900 pt-16 flex flex-col items-center w-full max-w-2xl">
          <p className="text-sm text-neutral-400 mb-6 font-mono">
            Built with ☕ & 💻 by <span className="text-emerald-400 font-bold">@alifauliaxd</span>
          </p>
          <div className="flex gap-8">
            <a href="https://x.com/kaiclyde447" target="_blank" className="text-neutral-500 hover:text-white transition uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              kaiclyde447
            </a>
            <a href="https://github.com/alifauliaxd" target="_blank" className="text-neutral-500 hover:text-white transition uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              alifauliaxd
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}