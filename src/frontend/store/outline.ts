import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'


type State = {
  inputVal: string;
  paper: string;
}

type Actions = {
  updateInputVal: (message: string) => void
  updatePaper: (newPaper: string | ((prev: string) => string)) => void
}

export const useOutlineStore = create<State & Actions>()(
  immer((set) => ({
    inputVal: '',
    paper: '',
    updateInputVal: (message: string) =>
      set((state) => {
        state.inputVal += message
      }),
    updatePaper: (newPaper: string | ((prev: string) => string)) =>
      set((state) => {
        state.paper = typeof newPaper === 'function'
          ? newPaper(state.paper)
          : newPaper;
      }),
  })),
)
