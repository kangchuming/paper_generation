import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'


type State = {
  inputVal: string;
  paper: string;
  endOutlineMarker: boolean;  // 大纲终止标记
}

type Actions = {
  updateInputVal: (message: string | ((prev: string) => string)) => void
  updatePaper: (newPaper: string) => void
  updateEndOutlineMarker: (flag: boolean) => void    // 更新大纲终止标记
}

export const useOutlineStore = create<State & Actions>()(
  immer((set) => ({
    inputVal: '',
    paper: '',
    endOutlineMarker: false,
    updateInputVal: (message) =>
      set((state) => {
        if (typeof message === 'function') {
          state.inputVal = message(state.inputVal);
        } else {
          state.inputVal += message;
        }
      }),
    updatePaper: (newPaper: string) =>
      set((state) => {
        state.paper += newPaper
      }),
    updateEndOutlineMarker: (flag: boolean) => set((state) => {
      state.endOutlineMarker = flag;
    })
  })),
)
