import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Brand from '../components/studio/Brand';
import AuthCard from '../components/landing/AuthCard';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit({ fullName, email, password, confirmPassword }) {
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signup(fullName, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="creator-signup">
      <nav className="creator-nav"><Brand /><Link className="studio-btn studio-btn--outline" to="/login">Back to home</Link></nav>
      <main className="creator-signup__main"><AuthCard mode="signup" onSubmit={handleSubmit} error={error} isLoading={isLoading} /></main>
    </div>
  );
}
