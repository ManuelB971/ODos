import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ParcoursPickerSheet } from '@/components/social/ParcoursPickerSheet';

const mockAddItem = jest.fn(() => Promise.resolve());
const mockCreate = jest.fn(() => Promise.resolve({ parcours: { id: 99 } }));

jest.mock('@/hooks/useParcours', () => ({
  useParcoursList: () => ({
    data: {
      member: [
        { id: 1, title: 'Week-end Paris', itemCount: 2, isOwner: true },
        { id: 2, title: 'Nature', itemCount: 0, isOwner: false },
      ],
    },
    isLoading: false,
  }),
  useParcoursMutations: () => ({
    create: { mutateAsync: mockCreate, isPending: false },
    addItem: { mutateAsync: mockAddItem, isPending: false },
  }),
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

describe('ParcoursPickerSheet', () => {
  beforeEach(() => {
    mockAddItem.mockClear();
    mockCreate.mockClear();
  });

  it('lists existing parcours', () => {
    render(<ParcoursPickerSheet visible onClose={jest.fn()} activity={{ id: 7, name: 'Musée' }} />);
    expect(screen.getByText('Week-end Paris')).toBeTruthy();
    expect(screen.getByText('Nature')).toBeTruthy();
  });

  it('adds the activity to a chosen parcours', async () => {
    const onClose = jest.fn();
    render(<ParcoursPickerSheet visible onClose={onClose} activity={{ id: 7, name: 'Musée' }} />);
    fireEvent.press(screen.getByText('Week-end Paris'));
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith({ parcoursId: 1, activityId: 7 });
    });
  });

  it('creates a new parcours with the activity', async () => {
    render(<ParcoursPickerSheet visible onClose={jest.fn()} activity={{ id: 7, name: 'Musée' }} />);
    fireEvent.press(screen.getByText('Nouveau parcours'));
    fireEvent.changeText(screen.getByPlaceholderText('Nom du parcours (ex. Week-end Paris)'), 'Sortie');
    fireEvent(screen.getByPlaceholderText('Nom du parcours (ex. Week-end Paris)'), 'submitEditing');
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ title: 'Sortie', activityIds: [7] });
    });
  });
});
