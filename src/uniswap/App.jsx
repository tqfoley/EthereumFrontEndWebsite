import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { ethers } from 'ethers';
import './App.css';

// Base network configuration
const BASE_NETWORK = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
};

// Uniswap V3 contracts on Base
const CONTRACTS = {
  NONFUNGIBLE_POSITION_MANAGER_OLD: '0x03a520b32C04BF3bEEf7BF5feB1f2e5C5F2E3dc',
  NONFUNGIBLE_POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  UNISWAP_V3_FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  SWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481'
};

// Common token addresses on Base
const TOKENS = {
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    decimals: 18
  },
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6
  },
  DAI: {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    decimals: 18
  }
};

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const POSITION_MANAGER_ABI = [
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'
];

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form states for creating new position
  const [token0, setToken0] = useState('WETH');
  const [token1, setToken1] = useState('USDC');
  const [fee, setFee] = useState(3000);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [priceRange, setPriceRange] = useState({ lower: '', upper: '' });

  useEffect(() => {
    initializeWeb3();
  }, []);

  const initializeWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        
        // Check if already connected
        const accounts = await web3Instance.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await switchToBase();
        }
      } catch (error) {
        setError('Failed to initialize Web3: ' + error.message);
      }
    } else {
      setError('Please install MetaMask to use this application');
    }
  };

  const connectWallet = async () => {
    if (!web3) return;
    
    try {
      setLoading(true);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
      await switchToBase();
      setError('');
    } catch (error) {
      setError('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchToBase = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_NETWORK.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_NETWORK],
          });
        } catch (addError) {
          throw new Error('Failed to add Base network');
        }
      } else {
        throw switchError;
      }
    }
  };

  const loadPositions = async () => {
    if (!web3 || !account) return;
    
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const positionManager = new ethers.Contract(
        CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
        POSITION_MANAGER_ABI,
        provider
      );

      const balance = await positionManager.balanceOf(account);
      const positionList = [];

      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await positionManager.tokenOfOwnerByIndex(account, i);
        const position = await positionManager.positions(tokenId);
        
        const token0Symbol = await getTokenSymbol(position.token0);
        const token1Symbol = await getTokenSymbol(position.token1);
        
        positionList.push({
          tokenId: tokenId.toString(),
          token0: position.token0,
          token1: position.token1,
          token0Symbol,
          token1Symbol,
          fee: Number(position.fee),
          tickLower: Number(position.tickLower),
          tickUpper: Number(position.tickUpper),
          liquidity: position.liquidity.toString(),
          tokensOwed0: position.tokensOwed0.toString(),
          tokensOwed1: position.tokensOwed1.toString()
        });
      }

      setPositions(positionList);
    } catch (error) {
      setError('Failed to load positions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTokenSymbol = async (tokenAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return await tokenContract.symbol();
    } catch {
      return 'Unknown';
    }
  };

  const createPosition = async () => {
    if (!web3 || !account) return;
    
    try {
      setLoading(true);
      
      const token0Address = TOKENS[token0].address;
      const token1Address = TOKENS[token1].address;
      
      // Convert amounts to wei
      const amount0Desired = ethers.parseUnits(amount0, TOKENS[token0].decimals);
      const amount1Desired = ethers.parseUnits(amount1, TOKENS[token1].decimals);
      
      // Calculate tick range (simplified - in production you'd want proper price calculations)
      const tickLower = Math.floor(parseFloat(priceRange.lower) / 0.0001) * 10;
      const tickUpper = Math.floor(parseFloat(priceRange.upper) / 0.0001) * 10;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Approve tokens if needed
      await approveToken(token0Address, amount0Desired, signer);
      await approveToken(token1Address, amount1Desired, signer);
      
      const positionManager = new ethers.Contract(
        CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
        POSITION_MANAGER_ABI,
        signer
      );
      
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
      
      const mintParams = {
        token0: token0Address < token1Address ? token0Address : token1Address,
        token1: token0Address < token1Address ? token1Address : token0Address,
        fee: fee,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: token0Address < token1Address ? amount0Desired : amount1Desired,
        amount1Desired: token0Address < token1Address ? amount1Desired : amount0Desired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: account,
        deadline: deadline
      };
      
      const tx = await positionManager.mint(mintParams);
      await tx.wait();
      
      setError('');
      alert('Position created successfully!');
      await loadPositions();
      
      // Reset form
      setAmount0('');
      setAmount1('');
      setPriceRange({ lower: '', upper: '' });
      
    } catch (error) {
      setError('Failed to create position: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveToken = async (tokenAddress, amount, signer) => {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tx = await tokenContract.approve(CONTRACTS.NONFUNGIBLE_POSITION_MANAGER, amount);
    await tx.wait();
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Uniswap V3 Positions - Base Network</h1>
        
        {error && <div className="error">{error}</div>}
        
        <div className="wallet-section">
          {!account ? (
            <button 
              onClick={connectWallet} 
              disabled={loading}
              className="connect-btn"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="wallet-info">
              <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <button onClick={loadPositions} disabled={loading} className="load-btn">
                {loading ? 'Loading...' : 'Load Positions'}
              </button>
            </div>
          )}
        </div>

        {account && (
          <>
            <div className="positions-section">
              <h2>Your Positions ({positions.length})</h2>
              {positions.length === 0 ? (
                <p>No positions found</p>
              ) : (
                <div className="positions-grid">
                  {positions.map((position) => (
                    <div key={position.tokenId} className="position-card">
                      <h3>Position #{position.tokenId}</h3>
                      <p><strong>Pair:</strong> {position.token0Symbol}/{position.token1Symbol}</p>
                      <p><strong>Fee:</strong> {position.fee / 10000}%</p>
                      <p><strong>Liquidity:</strong> {position.liquidity}</p>
                      <p><strong>Tick Range:</strong> {position.tickLower} to {position.tickUpper}</p>
                      {(position.tokensOwed0 !== '0' || position.tokensOwed1 !== '0') && (
                        <div className="fees-owed">
                          <p><strong>Fees Available:</strong></p>
                          <p>{position.token0Symbol}: {position.tokensOwed0}</p>
                          <p>{position.token1Symbol}: {position.tokensOwed1}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="create-position-section">
              <h2>Create New Position</h2>
              <div className="form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Token 0:</label>
                    <select value={token0} onChange={(e) => setToken0(e.target.value)}>
                      {Object.keys(TOKENS).map(token => (
                        <option key={token} value={token}>{token}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Token 1:</label>
                    <select value={token1} onChange={(e) => setToken1(e.target.value)}>
                      {Object.keys(TOKENS).map(token => (
                        <option key={token} value={token}>{token}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fee Tier:</label>
                    <select value={fee} onChange={(e) => setFee(parseInt(e.target.value))}>
                      <option value={500}>0.05%</option>
                      <option value={3000}>0.30%</option>
                      <option value={10000}>1.00%</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{token0} Amount:</label>
                    <input
                      type="number"
                      value={amount0}
                      onChange={(e) => setAmount0(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{token1} Amount:</label>
                    <input
                      type="number"
                      value={amount1}
                      onChange={(e) => setAmount1(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Lower Price:</label>
                    <input
                      type="number"
                      value={priceRange.lower}
                      onChange={(e) => setPriceRange({...priceRange, lower: e.target.value})}
                      placeholder="Lower bound"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Upper Price:</label>
                    <input
                      type="number"
                      value={priceRange.upper}
                      onChange={(e) => setPriceRange({...priceRange, upper: e.target.value})}
                      placeholder="Upper bound"
                    />
                  </div>
                </div>

                <button 
                  onClick={createPosition}
                  disabled={loading || !amount0 || !amount1 || !priceRange.lower || !priceRange.upper}
                  className="create-btn"
                >
                  {loading ? 'Creating Position...' : 'Create Position'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
