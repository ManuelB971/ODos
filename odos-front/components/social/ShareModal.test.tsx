import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ShareModal } from '@/components/social/ShareModal';
import { shareActivity } from '@/scripts/api';

jest.mock('@/hooks/useFriendships', () => ({
  useFriendships: () => ({
    friends: [
      { id: 1, status: 'accepted', otherUser: { id: 10, displayName: 'Alice', avatarUrl: null } },
      { id: 2, status: 'accepted', otherUser: { id: 11, displayName: 'Bob', avatarUrl: null } },
    ],
  }),
}));

jest.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    data: {
      member: [{ id: 5, name: 'Randonneurs', description: null, avatarUrl: null, isPrivate: false, memberCount: 3, createdAt: '' }],
    },
  }),
}));

jest.mock('@/scripts/api', () => ({
  shareActivity: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/context/ThemeContext', () => ({
  useOdosColors: () => ({
    background: '#fff',
    surface: '#f5f5f5',
    elevated: '#fff',
    text: '#111',
    muted: '#666',
    border: '#ddd',
    accent: '#7c3aed',
    onAccent: '#fff',
    danger: '#ef4444',
  }),
}));

describe('ShareModal', () => {
  it('renders friends and groups lists', () => {
    render(
      <ShareModal visible activityId={1} activityName="Musée" onClose={jest.fn()} />,
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Randonneurs')).toBeTruthy();
  });

  it('submit calls shareActivity for selected targets', async () => {
    const onClose = jest.fn();
    render(
      <ShareModal visible activityId={42} activityName="Parc" onClose={onClose} />,
    );
    fireEvent.press(screen.getByText('Alice'));
    fireEvent.press(screen.getByText('Randonneurs'));
    fireEvent.press(screen.getByText('Envoyer'));
    await waitFor(() => {
      expect(shareActivity).toHaveBeenCalled();
    });
  });
});
