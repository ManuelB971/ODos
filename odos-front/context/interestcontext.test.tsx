import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { InterestProvider, useInterests } from '@/context/interestcontext';

const mockUseAuth = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function Probe() {
  const { interests } = useInterests();
  return <Text testID="interests">{interests.join(',')}</Text>;
}

describe('InterestProvider', () => {
  it('hydrates interests from authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, interests: [{ id: 10, name: 'Sport' }, { id: 11, name: 'Culture' }] },
    });

    render(
      <InterestProvider>
        <Probe />
      </InterestProvider>
    );

    expect(screen.getByTestId('interests').props.children).toBe('Sport,Culture');
  });

  it('clears interests when user logs out', () => {
    const state: { user: { id: number; interests: Array<{ id: number; name: string }> } | null } = {
      user: { id: 1, interests: [{ id: 10, name: 'Sport' }] },
    };
    mockUseAuth.mockImplementation(() => state);

    const { rerender } = render(
      <InterestProvider>
        <Probe />
      </InterestProvider>
    );
    expect(screen.getByTestId('interests').props.children).toBe('Sport');

    state.user = null;
    rerender(
      <InterestProvider>
        <Probe />
      </InterestProvider>
    );
    expect(screen.getByTestId('interests').props.children).toBe('');
  });
});
