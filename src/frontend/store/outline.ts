import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type State = {
  inputVal: string;
  paper: string;
}

type Actions = {
  updateInputVal: (newInputVal: string | ((prev: string) => string)) => void
  updatePaper: (newPaper: string | ((prev: string) => string)) => void
}

export const useOutlineStore = create<State & Actions>()(
  immer((set) => ({
    inputVal: '',
    paper: '',
    updateInputVal: (newInputVal: string | ((prev: string) => string)) =>
      set((state) => {
        state.inputVal = typeof newInputVal === 'function' ? newInputVal(state.inputVal) : newInputVal;
      }),
    updatePaper: (newPaper: string | ((prev: string) => string)) =>
      set((state) => {
        state.paper = typeof newPaper === 'function'
          ? newPaper(state.paper)
          : newPaper;
      }),
  })),
)
