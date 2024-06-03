import Modal from 'react-modal';
import React, { useState, useEffect } from 'react';

const customStyles = {
  content: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#0a0b0d',
    color: '#ffffff',
    padding: 0,
    border: 'none',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
  },
  modalTitle: {
    color: '#ffffff',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    margin: 0,
  },
  overlay: {
    backgroundColor: 'rgba(10, 11, 13, 0.75)',
    zIndex: 9998,
  },
};

const tokenRowStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.2rem',
  margin: '0.2rem',
  cursor: 'pointer',
};

const tokenContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
};

const tokenImageStyle = {
  width: '20px',
  height: '20px',
  marginRight: '0.5rem',
};

const tokenTextStyle = {
  fontSize: '14px',
};

const ModalPage = ({ isOpen, toggleModal, setSelectedToken }) => {
  const [tokens, setTokens] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTokenList = async () => {
      try {
        const response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
        const tokenListJSON = await response.json();
        setTokens(tokenListJSON.tokens);
      } catch (error) {
        console.error('Error fetching token list:', error);
      }
    };

    fetchTokenList();
  }, []);

  const selectToken = (token) => {
    toggleModal();
    setSelectedToken(token);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredTokens = tokens.filter(token => token.symbol.toLowerCase().startsWith(searchTerm.toLowerCase()));

  // Define popular tokens manually
  const popularTokens = [
    {
      "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "chainId": 1,
      "name": "ETH",
      "symbol": "ETH",
      "decimals": 18,
      "logoURI": "https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628"
    },
    {
      "address": "0xB6eD7644C69416d67B522e20bC294A9a9B405B31",
      "chainId": 1,
      "name": "0xBitcoin Token",
      "symbol": "0xBTC",
      "decimals": 8,
      "logoURI": "https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400"
    },
    {
      "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "chainId": 1,
      "name": "Dai Stablecoin",
      "symbol": "DAI",
      "decimals": 18,
      "logoURI": "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996"
    },
    {
      "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      "chainId": 1,
      "name": "Wrapped BTC",
      "symbol": "WBTC",
      "decimals": 8,
      "logoURI": "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857"
    },
    {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "chainId": 1,
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "logoURI": "https://assets.coingecko.com/coins/images/6319/standard/usdc.png?1696506694"
    },
    {
      "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "chainId": 1,
      "name": "Tether USD",
      "symbol": "USDT",
      "decimals": 6,
      "logoURI": "https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661"
    }
  ];

  return (
    <Modal isOpen={isOpen} style={customStyles}>
      <div className="modal-content">
        <div className="modal-header" style={customStyles.modalHeader}>
          <input
            type="text"
            onChange={handleSearch}
            style={customStyles.modalTitle}
            placeholder='Select a token'
            value={searchTerm}
          />
          <button
            type="button"
            className="close"
            style={customStyles.closeButton}
            onClick={toggleModal}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* List 6 popular tokens */}
        <div className="popular-tokens" style={tokenContainerStyle}>
          {popularTokens.map((token, index) => (
            <div className="token_row" key={index} style={tokenRowStyle} onClick={() => selectToken(token)}>
              <img className="token_list_img" src={token.logoURI} alt={token.symbol} style={tokenImageStyle} />
              <span className="token_list_text" style={tokenTextStyle}>{token.symbol}</span>
            </div>
          ))}
        </div>

        {/* List all tokens that match the search term */}
        <div className="modal-body" style={tokenContainerStyle}>
          {filteredTokens.map((token, index) => (
            <div className="token_row" key={index} style={tokenRowStyle} onClick={() => selectToken(token)}>
              <img className="token_list_img" src={token.logoURI} alt={token.symbol} style={tokenImageStyle} />
              <span className="token_list_text" style={tokenTextStyle}>{token.symbol}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ModalPage;
