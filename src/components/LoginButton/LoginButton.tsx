import { Button } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginButton.scss';

export const LoginButton = () => {
  const { isUserLoggedIn, setIsLoginModalOpen, nickname } = useUserContext();

  if (isUserLoggedIn)
    return (
      <Button className="login-button" onClick={() => setIsLoginModalOpen(true)}>
        {nickname}
      </Button>
    );

  return (
    <Button className="login-button" onClick={() => setIsLoginModalOpen(true)}>
      Login
    </Button>
  );
};
