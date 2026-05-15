import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import AuthCard from '../components/landing/AuthCard';
import FeaturesSection from '../components/landing/FeaturesSection';
import AudienceSection from '../components/landing/AudienceSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FAQSection from '../components/landing/FAQSection';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';

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
    <div className="ln-page">
      <LandingNavbar activePage="login" />
      <HeroSection />
      <AuthCard mode="login" onSubmit={handleSubmit} error={error} isLoading={isLoading} />
      <FeaturesSection />
      <AudienceSection />
      <HowItWorksSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
