import React, { useState, useEffect } from 'react';
import { Wallet, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const EthereumWalletSender = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Base network configuration
  const BASE_NETWORK = {
    chainId: '0x2105', // 8453 in hex
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await checkNetwork();
          await getBalance(accounts[0]); // Get balance after network check
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setMessage('Please install MetaMask or another Ethereum wallet');
      setMessageType('error');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      setAccount(accounts[0]);
      await getBalance(accounts[0]);
      await switchToBaseNetwork();
      
      setMessage('Wallet connected successfully!');
      setMessageType('success');
    } catch (error) {
      setMessage(`Failed to connect wallet: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToBaseNetwork = async () => {
    try {
      // Try to switch to Base network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_NETWORK.chainId }]
      });
    } catch (switchError) {
      // If Base network is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_NETWORK]
          });
        } catch (addError) {
          throw new Error('Failed to add Base network');
        }
      } else {
        throw switchError;
      }
    }
  };

  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== BASE_NETWORK.chainId) {
        setMessage('Please switch to Base network');
        setMessageType('error');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  };

  const getBalance = async (address) => {
    try {
      // First ensure we're on Base network to get accurate balance
      await switchToBaseNetwork();
      
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      
      // Convert from wei to ETH
      const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
      setBalance(ethBalance.toFixed(6));
    } catch (error) {
      console.error('Error getting balance:', error);
      // If we can't switch networks or get balance, try to get balance via RPC call
      try {
        const response = await fetch(BASE_NETWORK.rpcUrls[0], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          }),
        });
        
        const data = await response.json();
        if (data.result) {
          const ethBalance = parseInt(data.result, 16) / Math.pow(10, 18);
          setBalance(ethBalance.toFixed(6));
        }
      } catch (rpcError) {
        console.error('Error getting balance via RPC:', rpcError);
        setBalance('0.000000');
      }
    }
  };

  const sendEthereum = async () => {
    if (!account) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    if (!recipientAddress || !amount) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setMessage('Invalid recipient address');
      setMessageType('error');
      return;
    }

    const networkValid = await checkNetwork();
    if (!networkValid) {
      await switchToBaseNetwork();
    }

    setIsSending(true);
    setMessage('');

    try {
      // Convert amount to wei
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString(16);

      const transactionParameters = {
        to: recipientAddress,
        from: account,
        value: '0x' + amountWei,
        gas: '0x5208', // 21000 gas limit for simple transfer
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
      });

      setMessage(`Transaction sent! Hash: ${txHash}`);
      setMessageType('success');
      
      // Clear form
      setRecipientAddress('');
      setAmount('');
      
      // Refresh balance
      await getBalance(account);
    } catch (error) {
      if (error.code === 4001) {
        setMessage('Transaction cancelled by user');
        setMessageType('error');
      } else {
        setMessage(`Transaction failed: ${error.message}`);
        setMessageType('error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('');
    setRecipientAddress('');
    setAmount('');
    setMessage('Wallet disconnected');
    setMessageType('success');
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Ethereum Sender
        </h1>
        <p className="text-sm text-gray-600">Send ETH on Base Network</p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        {!account ? (
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">Connected</p>
              <p className="text-xs text-green-600 break-all">{account}</p>
              <p className="text-sm text-green-700 mt-1">
                Base Balance: {balance} ETH
              </p>
            </div>
            <button
              onClick={disconnectWallet}
              className="w-full text-sm text-red-600 hover:text-red-700 font-medium py-2"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Send Form */}
      {account && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (ETH)
            </label>
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <button
            onClick={sendEthereum}
            disabled={isSending || !recipientAddress || !amount}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isSending ? 'Sending...' : 'Send ETH'}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          messageType === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            messageType === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* Network Info */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <span className="font-medium">Network:</span> Base Mainnet
        </p>
        <p className="text-xs text-gray-600">
          <span className="font-medium">Chain ID:</span> 8453
        </p>
      </div>
    </div>
  );
};

export default EthereumWalletSender;