import React, { useState } from 'react';

interface EditProfileModalProps {
  isOpen: boolean;
  initial: { username: string; email: string };
  onClose: () => void;
  onSubmit: (data: { username: string; email: string }) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, initial, onClose, onSubmit }) => {
  const [username, setUsername] = useState(initial.username);
  const [email, setEmail] = useState(initial.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!username.trim() || !email.trim()) {
      setError('Имя и Email обязательны');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onSubmit({ username: username.trim(), email: email.trim() });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Изменить профиль</h2>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Имя пользователя</label>
            <input className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-900 dark:text-gray-100" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-900 dark:text-gray-100" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-100 rounded" onClick={onClose} disabled={loading}>Отмена</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" onClick={handleSubmit} disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;


