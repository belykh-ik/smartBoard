import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xl">
            SB
          </div>
          <h1 className="mt-2 text-center text-3xl font-extrabold text-gray-900">SmartBoard</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Создайте новый аккаунт
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;