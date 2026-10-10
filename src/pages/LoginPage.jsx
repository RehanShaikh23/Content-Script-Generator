import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingExperience from '../components/landing/LandingExperience';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit({ email, password }) {
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LandingExperience onSubmit={handleSubmit} error={error} isLoading={isLoading} />
  );
}
