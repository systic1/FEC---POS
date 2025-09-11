import React, { useState } from 'react';
import { User } from '../auth';
import Button from './ui/Button';
import Input from './ui/Input';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  authenticate: (code: string) => User | null;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, authenticate }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    const user = authenticate(code);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError('Invalid Access Code. Please try again.');
      setCode('');
    }
  };
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setCode(e.target.value);
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Jump India</h1>
            <p className="text-gray-500">POS & Waiver System</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label="Enter Access Code"
              labelClassName="text-center"
              id="code-input"
              type="password"
              value={code}
              onChange={handleCodeChange}
              autoFocus
              className="text-center text-2xl h-14"
            />
            
            {error && <p className="text-red-500 text-sm text-center !-mt-2">{error}</p>}
            
            <Button type="submit" className="w-full" size="lg" disabled={!code}>
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
