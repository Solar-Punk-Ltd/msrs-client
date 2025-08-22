import { createContext, ReactChild, ReactElement, useContext, useMemo, useState } from 'react';

import { adminlogin, nicknameLogin, Session } from '@/utils/login';

interface ContextInterface {
  keys: {
    private: string;
    public: string;
  };
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  loginAsUser: (username: string) => Promise<void>;
  nickname: string;
  isUserLoggedIn: boolean;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isLoginModalOpen: boolean) => void;
}

const initialValues: ContextInterface = {
  keys: {
    private: '',
    public: '',
  },
  loginAsAdmin: async () => {},
  loginAsUser: async () => {},
  nickname: '',
  isUserLoggedIn: false,
  isAdmin: false,
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
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
  const [session, setSession] = useState<Session | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const loginAsAdmin = async (username: string, password: string) => {
    const res = await adminlogin(username, password);

    if (res.session) {
      setSession(res.session);
      setIsLoginModalOpen(false);
    } else {
      console.error('Admin login failed:', res.error);
    }
  };

  const loginAsUser = async (username: string) => {
    const res = await nicknameLogin(username);

    if (res.session) {
      setSession(res.session);
      setIsLoginModalOpen(false);
    } else {
      console.error('User login failed:', res.error);
    }
  };

  const nickname = useMemo(() => session?.username || '', [session]);

  const isUserLoggedIn = useMemo(() => !!session, [session]);

  const isAdmin = useMemo(() => session?.adminId !== undefined, [session]);

  const keys = useMemo(() => {
    if (!session) {
      return { private: '', public: '' };
    }

    return {
      private: session.privateKey,
      public: session.publicKey,
    };
  }, [session]);

  return (
    <Context.Provider
      value={{
        keys,
        loginAsAdmin,
        loginAsUser,
        nickname,
        isUserLoggedIn,
        isAdmin,
        isLoginModalOpen,
        setIsLoginModalOpen,
      }}
    >
      {children}
    </Context.Provider>
  );
}
