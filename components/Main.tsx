import Image from 'next/image'
import { RiSettings3Fill } from 'react-icons/ri'
import { AiOutlineDown } from 'react-icons/ai'
import ethLogo from '../assets/eth.png'
import { useContext, useState, useEffect } from 'react'
import { TransactionContext } from '../context/TransactionContext'
import Modal from 'react-modal'
import { useRouter } from 'next/router'
import TransactionLoader from './TransactionLoader'
import ModalPage from './ModalPage';
const uniswapPrice = require('uniswap-price');
import {autorouter}  from './getPool';
const { ethers}  = require( 'ethers');
const axios = require('axios');
const { Token, TradeType, TokenAmount, Trade } = require('@uniswap/sdk'); // Import relevant Uniswap SDK components

Modal.setAppElement('#__next')

interface Token {
  logoURI: string;
  symbol: string;
  address: string;
  decimals: number;
}

const style = {
  wrapper: `w-screen flex items-center justify-center mt-14`,
  content: `bg-[#191B1F] w-[40rem] rounded-2xl p-4`,
  formHeader: `px-2 flex items-center justify-between font-semibold text-xl`,
  transferPropContainer: `bg-[#20242A] my-3 rounded-2xl p-6 text-3xl  border border-[#20242A] hover:border-[#41444F]  flex justify-between`,
  transferPropInput: `bg-transparent placeholder:text-[#B2B9D2] outline-none mb-6 w-full text-2xl`,
  currencySelector: `flex w-1/4`,
  currencySelectorContent: `w-full h-min flex justify-between items-center bg-[#2D2F36] hover:bg-[#41444F] rounded-2xl text-xl font-medium cursor-pointer p-2 mt-[-0.2rem]`,
  currencySelectorIcon: `flex items-center`,
  currencySelectorTicker: `mx-2`,
  currencySelectorArrow: `text-lg`,
  confirmButton: `bg-[#2172E5] my-2 rounded-2xl py-6 px-8 text-xl font-semibold flex items-center justify-center cursor-pointer border border-[#2172E5] hover:border-[#234169]`,
}

const customStyles = {
  content: {
    top: '100%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#0a0b0d',
    padding: 0,
    border: 'none',
  },
  overlay: {
    backgroundColor: 'rgba(10, 11, 13, 0.75)',
  },
}

const Main = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedPayToken, setSelectedPayToken] = useState<Token | null>(null);
  const [selectedReceiveToken, setSelectedReceiveToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>(''); // Corrected the type to string
  const [price, setPrice] = useState<number>(0); // State to store price
  const [bestRoute, setBestRoute] = useState<string[]>([]);
  const [bestPrice, setBestPrice] = useState<string>('');
  const [tokenMetadataResults, setTokenMetadataResults] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchPrice = async () => {
        try {
            if (!selectedPayToken || !selectedReceiveToken || !amount) return;

            const sellToken = selectedPayToken?.address;
            const sellTokenDecimal = selectedPayToken?.decimals;
            const buyToken = selectedReceiveToken?.address;
            const buyTokenDecimal = selectedReceiveToken?.decimals;

            const amount1 = ethers.utils.parseUnits(amount, sellTokenDecimal);

            let data2 = await uniswapPrice.getExecutionPrice(sellToken, sellTokenDecimal, buyToken, buyTokenDecimal, amount1.toString());
            console.log('data2', data2);
            setPrice(data2);

            const result = await autorouter(sellToken, buyToken, amount);
            const bestRoute1 = result?.bestRoute;
            const bestPrice1 = result?.bestPrice ?? 0;

            setBestRoute(bestRoute1);
            console.log(bestRoute1);
            setBestPrice(bestPrice1.toString());

            // Fetch token metadata for each token in the best route
            const tokenMetadataPromises = bestRoute1.map(async (token: string) => { // Explicitly define type as string
                const response = await axios.get(`https://tokens.coingecko.com/uniswap/all.json`);
                const tokenList = response.data.tokens;
                const tokenMetadata = tokenList.find((t: { address: string }) => t.address === token.toLowerCase());
                if (tokenMetadata) {
                    return {
                        id: tokenMetadata.id,
                        symbol: tokenMetadata.symbol
                    };
                } else {
                    return null; // Handle the case when token metadata is not found
                }
            });

            // Wait for all token metadata promises to resolve
            const tokenMetadataResults = await Promise.all(tokenMetadataPromises);
            setTokenMetadataResults(tokenMetadataResults);

            console.log(tokenMetadataResults);
        } catch (error) {
            console.error('Error fetching price:', error);
        }
    };

    fetchPrice();
}, [selectedPayToken, selectedReceiveToken, amount]);




  const { formData, sendTransaction } = useContext(TransactionContext)
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    const { addressTo, amount } = formData
    e.preventDefault()

    if (!addressTo || !amount) return

    sendTransaction()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  }

  const [isModalOpenPay, setIsModalOpenPay] = useState(false);
  const [isModalOpenReceive, setIsModalOpenReceive] = useState(false);

  const handleClickPay = () => {
    setIsModalOpenPay(true);
  };

  const handleClickReceive = () => {
    setIsModalOpenReceive(true);
  };

  const toggleModalPay = () => {
    setIsModalOpenPay(!isModalOpenPay);
  };

  const toggleModalReceive = () => {
    setIsModalOpenReceive(!isModalOpenReceive);
  };

  return (

    <div className={style.wrapper}>
      <div className={style.content}>
        <div className={style.formHeader}>
          <div>Swap</div>
          <div>
            <RiSettings3Fill />
          </div>
        </div>

        You pay

      
        <div className={style.transferPropContainer}>
          <input
            type='text'
            className={style.transferPropInput}
            placeholder='0'
            pattern='^[0-9]*[.,]?[0-9]*$'
            value= {amount}
            onChange={handleChange}
          />

          {selectedPayToken === null ? (
            <div className={style.currencySelector} onClick={handleClickPay}>
              <div className={style.currencySelectorContent}>
                <div className={style.currencySelectorIcon}>
                  <Image src={ethLogo} alt='eth logo' height={20} width={20} />
                </div>
                <div className={style.currencySelectorTicker}>ETH</div>
                <AiOutlineDown className={style.currencySelectorArrow} />
              </div>
            </div>
          ) : (
            <div className={style.currencySelector} onClick={handleClickPay}>

              <div className={style.currencySelectorContent}>
                <div className={style.currencySelectorIcon}>
                  <img className="token_list_img" src={selectedPayToken.logoURI} alt={selectedPayToken.symbol} />
                </div>
                <span className="token_list_text">{selectedPayToken.symbol}</span>
                <AiOutlineDown className={style.currencySelectorArrow} />
              </div>
            </div>
          )}

        </div>



        You receive
        <div className={style.transferPropContainer}>
          <input
            type='text'
            className={style.transferPropInput}
            placeholder='0'
            pattern='^[0-9]*[.,]?[0-9]*$'
            value={price} // Assuming price is displayed in this input
            readOnly
            />

          {selectedReceiveToken === null ? (
            <div className={style.currencySelector} onClick={handleClickReceive}>
              <div className={style.currencySelectorContent}>
                <div className={style.currencySelectorIcon}>
                  <Image src={ethLogo} alt='eth logo' height={20} width={20} />
                </div>
                <div className={style.currencySelectorTicker}>ETH</div>
                <AiOutlineDown className={style.currencySelectorArrow} />
              </div>
            </div>
          ) : (
            <div className={style.currencySelector} onClick={handleClickReceive}>
              <div className={style.currencySelectorContent}>
                <div className={style.currencySelectorIcon}>
                  <img className="token_list_img" src={selectedReceiveToken.logoURI} alt={selectedReceiveToken.symbol} />
                </div>
                <span className="token_list_text">{selectedReceiveToken.symbol}</span>
                <AiOutlineDown className={style.currencySelectorArrow} />
              </div>
            </div>
          )}

        </div>

        <div>
    <h2>Best Route:</h2>
    <ul>
        {bestRoute.map((token, index) => {
            // Find the corresponding token metadata for the current token in the best route
            const tokenMetadata = tokenMetadataResults.find(meta => meta && meta.id === token);
            // Extract the symbol from the metadata if available
            const symbol = tokenMetadata ? tokenMetadata.symbol : "Unknown";
            // Return the JSX for displaying the token symbol
            return (
                <li key={index}>{symbol}</li>
            );
        })}
    </ul>

    <h2>Best Price: {bestPrice}</h2>
</div>

    


        <div onClick={e => handleSubmit(e)} className={style.confirmButton}>
          Confirm
        </div>
      </div>


      <ModalPage isOpen={isModalOpenPay} toggleModal={toggleModalPay} setSelectedToken={setSelectedPayToken}/>

      <ModalPage isOpen={isModalOpenReceive} toggleModal={toggleModalReceive} setSelectedToken={setSelectedReceiveToken}/>


      <Modal isOpen={!!router.query.loading} style={customStyles}>
        <TransactionLoader />
      </Modal>
    </div>
  )
}

export default Main