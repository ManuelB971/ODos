import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

import { InterestContextType } from '@/types';

export const InterestContext = createContext<InterestContextType>({
  interests: [],
  setInterests: () => { },
});

import { InterestProviderProps } from '@/types';

export function InterestProvider({ children }: InterestProviderProps) {
  const [interests, setInterests] = useState<string[]>([]);

  return (
    <InterestContext.Provider value={{ interests, setInterests }}>
      {children}
    </InterestContext.Provider>
  );
}

export const useInterests = () => useContext(InterestContext);
