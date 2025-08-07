import { Button } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginButton.scss';

export const LoginButton = () => {
  const { isUserLoggedIn, setIsNicknameModalOpen, nickname } = useUserContext();

  if (isUserLoggedIn)
    return (
      <Button className="login-button" onClick={() => setIsNicknameModalOpen(true)}>
        {nickname}
      </Button>
    );

  return (
    <Button className="login-button" onClick={() => setIsNicknameModalOpen(true)}>
      Login
    </Button>
  );
};
