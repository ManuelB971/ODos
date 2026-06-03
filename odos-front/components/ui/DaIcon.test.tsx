import React from 'react';
import { render } from '@testing-library/react-native';

import { DaIcon, DA_ICON_NAMES } from '@/components/ui/DaIcon';

describe('DaIcon', () => {
  it('renders every DA icon name without crashing', () => {
    for (const name of DA_ICON_NAMES) {
      const { unmount } = render(<DaIcon name={name} size={20} />);
      unmount();
    }
  });
});
