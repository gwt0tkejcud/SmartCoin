import { BrowserProvider, Contract, getAddress, hexlify } from 'ethers';

const CONTRACT_ADDRESS = import.meta.env.VITE_STABLECOIN_CONTRACT_ADDRESS || '';

const ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function owner() view returns (address)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function mint(address to, uint64 amount)',
  'function burn(address from, uint64 amount)',
  'function transfer(address to, bytes32 encryptedAmount, bytes calldata inputProof) returns (bool)',
  'function setAllowed(address user, bool allowed)',
  'function batchSetAllowed(address[] users, bool allowed)',
  'function isAllowed(address) view returns (bool)',
  'function transferOwnership(address newOwner)',
  'function hasBalance(address) view returns (bool)',
  'function claimFaucet()',
  'function faucetAmount() view returns (uint64)',
  'function faucetCooldown() view returns (uint256)',
  'function lastFaucetClaim(address) view returns (uint256)',
  'function timeUntilNextClaim(address) view returns (uint256)',
  'function setFaucetSettings(uint64 newAmount, uint256 newCooldown)',
];

declare global {
  interface Window {
    relayerSDK?: {
      initSDK: () => Promise<void>;
      createInstance: (config: Record<string, unknown>) => Promise<any>;
      SepoliaConfig: Record<string, unknown>;
    };
    ethereum?: any;
    okxwallet?: any;
  }
}

let fheInstance: any = null;
let sdkPromise: Promise<any> | null = null;

const SDK_URL = 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs';

/**
 * Dynamically load Zama FHE SDK from CDN
 */
const loadSdk = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires browser environment');
  }

  if (window.relayerSDK) {
    console.log('✅ SDK already loaded');
    return window.relayerSDK;
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
      if (existing) {
        console.log('⏳ SDK script tag exists, waiting...');
        // Wait a bit for SDK to initialize
        const checkInterval = setInterval(() => {
          if (window.relayerSDK) {
            clearInterval(checkInterval);
            resolve(window.relayerSDK);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (window.relayerSDK) {
            resolve(window.relayerSDK);
          } else {
            reject(new Error('SDK script exists but window.relayerSDK not initialized'));
          }
        }, 5000);
        return;
      }

      console.log('📦 Loading SDK from CDN...');
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;

      script.onload = () => {
        console.log('📦 Script loaded, waiting for SDK initialization...');
        // Give SDK time to initialize
        setTimeout(() => {
          if (window.relayerSDK) {
            console.log('✅ SDK initialized');
            resolve(window.relayerSDK);
          } else {
            console.error('❌ window.relayerSDK still undefined after load');
            reject(new Error('relayerSDK unavailable after load'));
          }
        }, 500);
      };

      script.onerror = () => {
        console.error('❌ Failed to load SDK script');
        reject(new Error('Failed to load FHE SDK'));
      };

      document.body.appendChild(script);
    });
  }

  return sdkPromise;
};

/**
 * Initialize FHE instance with Sepolia network configuration
 */
export async function initFHE(provider?: any): Promise<any> {
  if (fheInstance) {
    return fheInstance;
  }

  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires browser environment');
  }

  const ethereumProvider = provider ||
    window.ethereum ||
    (window as any).okxwallet?.provider ||
    (window as any).okxwallet ||
    (window as any).coinbaseWalletExtension;

  if (!ethereumProvider) {
    throw new Error('Ethereum provider not found. Please connect your wallet first.');
  }

  console.log('🔌 Using Ethereum provider');

  const sdk = await loadSdk();
  if (!sdk) {
    throw new Error('FHE SDK not available');
  }

  await sdk.initSDK();

  const config = {
    ...sdk.SepoliaConfig,
    network: ethereumProvider,
  };

  fheInstance = await sdk.createInstance(config);
  console.log('✅ FHE instance initialized for Sepolia');

  return fheInstance;
}

/**
 * Get contract instance
 */
export const getContract = async (signer?: any) => {
  const provider = new BrowserProvider(window.ethereum);
  const signerOrProvider = signer || await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, ABI, signerOrProvider);
};

/**
 * Get encrypted balance of a user
 */
export const getEncryptedBalance = async (userAddress: string) => {
  try {
    const contract = await getContract();
    const encryptedBalance = await contract.balanceOf(userAddress);
    return encryptedBalance;
  } catch (error) {
    console.error('Error fetching encrypted balance:', error);
    throw error;
  }
};

/**
 * Decrypt balance
 */
export const decryptBalance = async (userAddress: string, encryptedBalance: bigint) => {
  try {
    const fhe = await initFHE();
    const checksumAddress = getAddress(CONTRACT_ADDRESS);

    console.log('[FHE] Requesting balance decryption...');
    const decrypted = await fhe.decrypt(checksumAddress, encryptedBalance, userAddress);

    console.log('[FHE] ✅ Balance decryption complete');
    return BigInt(decrypted);
  } catch (error) {
    console.error('Error decrypting balance:', error);
    throw error;
  }
};

/**
 * Encrypt transfer amount
 */
export const encryptTransferAmount = async (amount: number, userAddress: string, provider?: any) => {
  try {
    const fhe = await initFHE(provider);
    const checksumAddress = getAddress(CONTRACT_ADDRESS);

    console.log('[FHE] Creating encrypted input...');
    const input = fhe.createEncryptedInput(checksumAddress, userAddress);
    input.add64(BigInt(amount));

    console.log('[FHE] Encrypting...');
    const { handles, inputProof } = await input.encrypt();

    console.log('[FHE] ✅ Encryption complete');

    return {
      handle: hexlify(handles[0]),
      proof: hexlify(inputProof),
    };
  } catch (error) {
    console.error('Error encrypting amount:', error);
    throw error;
  }
};

/**
 * Transfer encrypted tokens
 */
export const transferEncrypted = async (to: string, amount: number, userAddress: string) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const { handle, proof } = await encryptTransferAmount(amount, userAddress);

    const tx = await contract.transfer(to, handle, proof);
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error transferring tokens:', error);
    throw error;
  }
};

/**
 * Mint tokens to a user (owner only)
 */
export const mintTokens = async (to: string, amount: number) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const tx = await contract.mint(to, BigInt(amount));
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
};

/**
 * Burn tokens from a user (owner only)
 */
export const burnTokens = async (from: string, amount: number) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const tx = await contract.burn(from, BigInt(amount));
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error burning tokens:', error);
    throw error;
  }
};

/**
 * Set allowed status for a user
 */
export const setAllowed = async (userAddress: string, allowed: boolean) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const tx = await contract.setAllowed(userAddress, allowed);
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error setting allowlist:', error);
    throw error;
  }
};

/**
 * Batch set allowed status for multiple users
 */
export const batchSetAllowed = async (userAddresses: string[], allowed: boolean) => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const tx = await contract.batchSetAllowed(userAddresses, allowed);
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error batch setting allowlist:', error);
    throw error;
  }
};

/**
 * Check if user is allowed
 */
export const checkAllowlist = async (userAddress: string) => {
  try {
    const contract = await getContract();
    const isAllowed = await contract.isAllowed(userAddress);
    return isAllowed;
  } catch (error) {
    console.error('Error checking allowlist:', error);
    throw error;
  }
};

/**
 * Get contract owner
 */
export const getContractOwner = async () => {
  try {
    const contract = await getContract();
    const owner = await contract.owner();
    return owner;
  } catch (error) {
    console.error('Error getting contract owner:', error);
    throw error;
  }
};

/**
 * Get total supply (encrypted)
 */
export const getTotalSupply = async () => {
  try {
    const contract = await getContract();
    const totalSupply = await contract.totalSupply();
    return totalSupply;
  } catch (error) {
    console.error('Error getting total supply:', error);
    throw error;
  }
};

/**
 * Decrypt total supply
 */
export const decryptTotalSupply = async (encryptedTotalSupply: bigint, userAddress: string) => {
  try {
    const fhe = await initFHE();
    const checksumAddress = getAddress(CONTRACT_ADDRESS);

    console.log('[FHE] Requesting total supply decryption...');
    const decrypted = await fhe.decrypt(checksumAddress, encryptedTotalSupply, userAddress);

    console.log('[FHE] ✅ Total supply decryption complete');
    return BigInt(decrypted);
  } catch (error) {
    console.error('Error decrypting total supply:', error);
    throw error;
  }
};

/**
 * Claim tokens from faucet
 */
export const claimFaucet = async () => {
  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract(signer);

    const tx = await contract.claimFaucet();
    await tx.wait();

    return tx;
  } catch (error) {
    console.error('Error claiming from faucet:', error);
    throw error;
  }
};

/**
 * Get faucet amount
 */
export const getFaucetAmount = async () => {
  try {
    const contract = await getContract();
    const amount = await contract.faucetAmount();
    return amount;
  } catch (error) {
    console.error('Error getting faucet amount:', error);
    throw error;
  }
};

/**
 * Get time until user can claim again
 */
export const getTimeUntilNextClaim = async (userAddress: string) => {
  try {
    const contract = await getContract();
    const timeRemaining = await contract.timeUntilNextClaim(userAddress);
    return Number(timeRemaining);
  } catch (error) {
    console.error('Error getting time until next claim:', error);
    throw error;
  }
};

/**
 * Get last faucet claim time
 */
export const getLastFaucetClaim = async (userAddress: string) => {
  try {
    const contract = await getContract();
    const lastClaim = await contract.lastFaucetClaim(userAddress);
    return Number(lastClaim);
  } catch (error) {
    console.error('Error getting last faucet claim:', error);
    throw error;
  }
};
