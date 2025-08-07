import { createContext, ReactChild, ReactElement, useContext, useState } from 'react';

import { getSigner } from '@/utils/wallet';

interface ContextInterface {
  key: {
    private: string | null;
    public: string | null;
  };
  isUserLoggedIn: boolean;
  setIsUserLoggedIn: (isUserLoggedIn: boolean) => void;
  nickname: string;
  setNickname: (nickName: string) => void;
  isNicknameModalOpen: boolean;
  setIsNicknameModalOpen: (isNickNameModalOpen: boolean) => void;
}

const initialValues: ContextInterface = {
  key: {
    private: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    public: null,
  },
  isUserLoggedIn: false,
  setIsUserLoggedIn: () => {},
  nickname: '',
  setNickname: () => {},
  isNicknameModalOpen: false,
  setIsNicknameModalOpen: () => {},
};

export const Context = createContext<ContextInterface>(initialValues);
export const Consumer = Context.Consumer;

export const useUserContext = () => {
  const context = useContext(Context);
  if (!context) throw new Error('useAppContext must be used within AppContextProvider');
  return context;
};

interface Props {
  children: ReactChild;
}

export function Provider({ children }: Props): ReactElement {
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);

  const getKeys = () => {
    if (!nickname) {
      return initialValues.key;
    }

    const signer = getSigner(nickname);
    return {
      private: signer.toHex(),
      public: signer.publicKey().address().toHex(),
    };
  };

  return (
    <Context.Provider
      value={{
        key: getKeys(),
        isUserLoggedIn,
        setIsUserLoggedIn,
        nickname,
        setNickname,
        isNicknameModalOpen,
        setIsNicknameModalOpen,
      }}
    >
      {children}
    </Context.Provider>
  );
}
