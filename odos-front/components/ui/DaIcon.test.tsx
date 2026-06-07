import React from 'react';
import { render } from '@testing-library/react-native';

import { DaIcon, DA_ICON_NAMES } from '@/components/ui/DaIcon';

describe('DaIcon', () => {
  it('renders every DA icon name without crashing', () => {
    for (const name of DA_ICON_NAMES) {
      const { unmount } = render(<DaIcon name={name} variant="inline" />);
      unmount();
    }
  });

  it('renders with blob container', () => {
    render(
      <DaIcon
        name="boussole"
        variant="tab"
        blob={{ seed: 0, backgroundColor: '#F9C49A', padding: 8 }}
      />,
    );
  });
});
