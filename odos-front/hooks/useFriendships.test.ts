import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useFriendships } from '@/hooks/useFriendships';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

describe('useFriendships', () => {
  it('splits friends and pending requests', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        member: [
          { id: 1, status: 'accepted', otherUser: { id: 2, displayName: 'Alice' } },
          { id: 2, status: 'pending', isIncoming: true, otherUser: { id: 3, displayName: 'Bob' } },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useFriendships());
    expect(result.current.friends).toHaveLength(1);
    expect(result.current.pending).toHaveLength(1);
  });
});
