import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

type InterestContextType = {
  interests: string[];
  setInterests: Dispatch<SetStateAction<string[]>>;
};

export const InterestContext = createContext<InterestContextType>({
  interests: [],
  setInterests: () => {},
});

type InterestProviderProps = {
  children: ReactNode;
};

export function InterestProvider({ children }: InterestProviderProps) {
  const [interests, setInterests] = useState<string[]>([]);

  return (
    <InterestContext.Provider value={{ interests, setInterests }}>
      {children}
    </InterestContext.Provider>
  );
}

export const useInterests = () => useContext(InterestContext);
