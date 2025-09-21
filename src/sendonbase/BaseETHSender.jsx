import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const BaseETHSender = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  // Base Network configuration
  const BASE_NETWORK = {
    chainId: '0x2105', // 8453 in hex
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed!');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Check if we're on Base network
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      if (chainId !== BASE_NETWORK.chainId) {
        // Try to switch to Base network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BASE_NETWORK.chainId }],
          });
        } catch (switchError) {
          // If Base network is not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BASE_NETWORK],
            });
          } else {
            throw switchError;
          }
        }
      }

      setAccount(accounts[0]);
      await getBalance(accounts[0]);
    } catch (err) {
      setError(`Failed to connect wallet: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getBalance = async (address) => {
    if (!web3 || !address) return;

    try {
      const balanceWei = await web3.eth.getBalance(address);
      const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
      setBalance(parseFloat(balanceEth).toFixed(6));
    } catch (err) {
      console.error('Failed to get balance:', err);
    }
  };

  const validateAddress = (address) => {
    return web3.utils.isAddress(address);
  };

  const sendETH = async () => {
    if (!web3 || !account || !recipient || !amount) {
      setError('Please fill in all fields and connect your wallet');
      return;
    }

    if (!validateAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient balance');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTxHash('');

      // Convert amount to Wei
      const amountWei = web3.utils.toWei(amount, 'ether');

      // Estimate gas
      const gasEstimate = await web3.eth.estimateGas({
        from: account,
        to: recipient,
        value: amountWei,
      });

      // Get current gas price
      const gasPrice = await web3.eth.getGasPrice();

      // Send transaction
      const transaction = await web3.eth.sendTransaction({
        from: account,
        to: recipient,
        value: amountWei,
        gas: gasEstimate,
        gasPrice: gasPrice,
      });

      setTxHash(transaction.transactionHash);
      
      // Refresh balance
      await getBalance(account);
      
      // Clear form
      setRecipient('');
      setAmount('');
      
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('0');
    setRecipient('');
    setAmount('');
    setTxHash('');
    setError('');
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Base Network ETH Sender</h2>
      
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {!account ? (
        <div>
          <p>Connect your wallet to send ETH on Base network</p>
          <button 
            onClick={connectWallet} 
            disabled={isLoading}
            style={{
              background: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
            <p><strong>Connected Account:</strong> {account}</p>
            <p><strong>Balance:</strong> {balance} ETH</p>
            <button 
              onClick={disconnectWallet}
              style={{
                background: '#d32f2f',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Disconnect
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Address:
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Amount (ETH):
            </label>
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={sendETH}
            disabled={isLoading || !recipient || !amount}
            style={{
              background: isLoading || !recipient || !amount ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: isLoading || !recipient || !amount ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              width: '100%'
            }}
          >
            {isLoading ? 'Sending...' : 'Send ETH'}
          </button>

          {txHash && (
            <div style={{ 
              marginTop: '20px', 
              padding: '10px', 
              background: '#e8f5e8', 
              borderRadius: '4px' 
            }}>
              <p><strong>Transaction Successful!</strong></p>
              <p>
                <strong>Hash:</strong>{' '}
                <a 
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#1976d2', textDecoration: 'none' }}
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BaseETHSender;
