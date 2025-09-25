export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  if (error instanceof Error) {
    const ethersError = error as any;

    // Try to get the original MetaMask/RPC error message
    if (ethersError.payload?.error?.message) {
      return ethersError.payload.error.message;
    }

    // Try to get ethers reason
    if (ethersError.reason && typeof ethersError.reason === 'string') {
      return ethersError.reason;
    }

    // Fallback to the error message
    if (ethersError.message) {
      return ethersError.message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error occurred';
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const originalMessage = extractErrorMessage(error);

  // Map common error messages to user-friendly ones
  const errorMappings: Record<string, string> = {
    'The requested account and/or method has not been authorized by the user.':
      'Please authorize this transaction in MetaMask.',
    'User denied transaction signature.': 'Transaction was cancelled by user.',
    'insufficient funds for gas * price + value': 'Insufficient funds to complete this transaction.',
    'execution reverted': 'Transaction failed. Please check your wallet balance and try again.',
    'user rejected transaction': 'Transaction was rejected by user.',
  };

  if (errorMappings[originalMessage]) {
    return errorMappings[originalMessage];
  }

  // Check for partial matches
  for (const [errorPattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (originalMessage.toLowerCase().includes(errorPattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  return originalMessage;
}
