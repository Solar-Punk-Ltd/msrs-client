import { createContext, ReactChild, ReactElement, useContext, useEffect, useMemo, useState } from 'react';

import { adminlogin, nicknameLogin, Session } from '@/utils/auth/login';
import { persistUserSession, purgeUserSession, restoreUserSession, StorageMethod } from '@/utils/auth/persistence';

interface ContextInterface {
  keys: {
    private: string;
    public: string;
  };
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  loginAsUser: (username: string) => Promise<void>;
  logout: () => void;
  nickname: string;
  isUserLoggedIn: boolean;
  isAdmin: boolean;
  instanceId: string;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (isLoginModalOpen: boolean) => void;
  session: Session | null;
  isLoading: boolean;
}

const initialValues: ContextInterface = {
  keys: {
    private: '',
    public: '',
  },
  loginAsAdmin: async () => {},
  loginAsUser: async () => {},
  logout: () => {},
  nickname: '',
  isUserLoggedIn: false,
  isAdmin: false,
  instanceId: '',
  isLoginModalOpen: false,
  setIsLoginModalOpen: () => {},
  session: null,
  isLoading: true,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = restoreUserSession(StorageMethod.LOCAL_STORAGE);
    if (savedSession) {
      setSession(savedSession);
    }
    setIsLoading(false);
  }, []);

  const loginAsAdmin = async (username: string, password: string) => {
    const res = await adminlogin(username, password);

    if (res.session) {
      setSession(res.session);
      persistUserSession(res.session, { method: StorageMethod.LOCAL_STORAGE });
      setIsLoginModalOpen(false);
    } else {
      console.error('Admin login failed:', res.error);
    }
  };

  const loginAsUser = async (username: string) => {
    const res = await nicknameLogin(username);

    if (res.session) {
      setSession(res.session);
      persistUserSession(res.session, { method: StorageMethod.LOCAL_STORAGE });
      setIsLoginModalOpen(false);
    } else {
      console.error('User login failed:', res.error);
    }
  };

  const logout = () => {
    setSession(null);
    purgeUserSession(StorageMethod.LOCAL_STORAGE);
  };

  const nickname = useMemo(() => session?.username || '', [session]);

  const isUserLoggedIn = useMemo(() => !!session, [session]);

  const isAdmin = useMemo(() => !!session?.instanceId, [session]);

  const instanceId = useMemo(() => session?.instanceId || '', [session]);

  const keys = useMemo(() => {
    if (!session) {
      return { private: '', public: '' };
    }

    return {
      private: session.userSecret.toLocaleLowerCase(),
      public: session.userId.toLocaleLowerCase(),
    };
  }, [session]);

  return (
    <Context.Provider
      value={{
        keys,
        loginAsAdmin,
        loginAsUser,
        logout,
        nickname,
        isUserLoggedIn,
        isAdmin,
        instanceId,
        isLoginModalOpen,
        setIsLoginModalOpen,
        session,
        isLoading,
      }}
    >
      {children}
    </Context.Provider>
  );
}
