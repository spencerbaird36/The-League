import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTokens } from '../hooks/useTokens';
import './TokenPurchase.css';

interface TokenPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

const TokenPurchase: React.FC<TokenPurchaseProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete
}) => {
  const { purchaseTokensDev, balance, error, setError } = useTokens();
  const [purchaseAmount, setPurchaseAmount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const predefinedAmounts = [50, 100, 250, 500, 1000];

  const handlePurchase = async () => {
    if (purchaseAmount < 1 || purchaseAmount > 10000) {
      setError('Purchase amount must be between 1 and 10,000 tokens');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage('');

    try {
      const result = await purchaseTokensDev(purchaseAmount);
      setSuccessMessage(`Successfully purchased ${result.tokensAdded} tokens! New balance: ${result.newBalance}`);

      if (onPurchaseComplete) {
        onPurchaseComplete();
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Purchase failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setPurchaseAmount(value);
    setError(null);
  };

  const handlePredefinedAmount = (amount: number) => {
    setPurchaseAmount(amount);
    setError(null);
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setError(null);
      setSuccessMessage('');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="token-modal-overlay" onClick={handleClose}>
      <div className="token-modal" onClick={e => e.stopPropagation()}>
        <div className="token-modal-header">
          <h2>Purchase Tokens</h2>
          <button className="token-close-btn" onClick={handleClose} disabled={isProcessing}>
            ×
          </button>
        </div>

        <div className="token-modal-body">
          {balance && (
            <div className="current-balance">
              <p><strong>Current Balance:</strong> {balance.availableBalance} tokens</p>
            </div>
          )}

          <div className="purchase-section">
            <h3>Development Token Purchase</h3>
            <p className="dev-notice">
              This is a development feature. In production, this would integrate with Stripe for real payments.
            </p>

            <div className="amount-selection">
              <label htmlFor="token-amount">Token Amount:</label>
              <input
                id="token-amount"
                type="number"
                min="1"
                max="10000"
                value={purchaseAmount}
                onChange={handleAmountChange}
                disabled={isProcessing}
              />
              <small>1 token = $1.00 USD</small>
            </div>

            <div className="predefined-amounts">
              <p>Quick amounts:</p>
              <div className="amount-buttons">
                {predefinedAmounts.map(amount => (
                  <button
                    key={amount}
                    className={`amount-btn ${purchaseAmount === amount ? 'selected' : ''}`}
                    onClick={() => handlePredefinedAmount(amount)}
                    disabled={isProcessing}
                  >
                    {amount} tokens
                  </button>
                ))}
              </div>
            </div>

            <div className="purchase-summary">
              <div className="summary-row">
                <span>Tokens:</span>
                <span>{purchaseAmount}</span>
              </div>
              <div className="summary-row total">
                <span>Total Cost:</span>
                <span>${purchaseAmount.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="token-error-message">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="token-success-message">
                {successMessage}
              </div>
            )}

            <div className="token-modal-actions">
              <button
                className="token-btn token-btn-primary"
                onClick={handlePurchase}
                disabled={isProcessing || purchaseAmount < 1 || purchaseAmount > 10000}
              >
                {isProcessing ? 'Processing...' : `Purchase ${purchaseAmount} Tokens`}
              </button>
              <button
                className="token-btn token-btn-secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TokenPurchase;